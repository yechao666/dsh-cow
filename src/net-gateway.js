/**
 * 主端出口网关：接受直接子节点的独立加密 WebSocket，把一条连接映射到一个
 * 目标 TCP 流。策略在本文件统一执行，子端不能借主端访问环回/私网服务。
 */
import { connect as netConnect } from 'node:net';
import { randomBytes } from 'node:crypto';
import { acceptUpgrade } from './ws.js';
import { verifyJoinProof } from './identity.js';
import { deriveSessionKey, open as openSealed, seal } from './crypto.js';
import { DEFAULT_PROXY_PORTS, parseAllowHosts, resolveProxyTarget } from './net-policy.js';

const AUTH_TIMEOUT_MS = 10_000;
const CONNECT_TIMEOUT_MS = 15_000;
const CHUNK_LIMIT = 4 * 1024 * 1024;

function sendJson(conn, value) {
  try { return conn.send(JSON.stringify(value)); } catch { return false; }
}

function sendSealed(conn, key, value) {
  return sendJson(conn, { enc: seal(key, value) });
}

function parseFrame(text) {
  try {
    const frame = JSON.parse(String(text ?? ''));
    return frame && typeof frame === 'object' ? frame : null;
  } catch {
    return null;
  }
}

export class NetGateway {
  constructor({ instance, peers, resolveConfig, logger }) {
    this.instance = instance;
    this.peers = peers;
    this.resolveConfig = resolveConfig;
    this.logger = logger ?? console;
    this.tunnels = new Set();
  }

  handleUpgrade(req, socket, head) {
    const config = this.resolveConfig();
    if (!config.proxyEnabled) {
      this.#reject(socket, 403, 'proxy disabled');
      return;
    }
    if (!this.instance.passwordHash) {
      this.#reject(socket, 403, 'proxy password not configured');
      return;
    }
    let conn;
    try {
      conn = acceptUpgrade(req, socket, head);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 代理升级失败：${error?.message ?? error}`);
      return;
    }
    const state = {
      conn,
      key: null,
      peerId: '',
      authenticated: false,
      target: null,
      buffer: Buffer.alloc(0),
      timer: null,
    };
    this.tunnels.add(state);
    const timeout = setTimeout(() => {
      if (!state.authenticated) {
        try { conn.close(1000, 'auth timeout'); } catch { conn.destroy(); }
      }
    }, AUTH_TIMEOUT_MS);
    timeout.unref?.();
    state.timer = timeout;
    conn.on('message', (text) => this.#onFrame(state, text));
    conn.on('close', () => this.#dispose(state));
    conn.on('error', (error) => {
      this.logger.warn?.(`[dsh-cow] 代理连接错误：${error?.message ?? error}`);
      this.#dispose(state);
    });
    const nonce = randomBytes(16).toString('hex');
    state.nonce = nonce;
    sendJson(conn, {
      type: 'auth.challenge',
      nonce,
      salt: String(this.instance.passwordSalt ?? ''),
    });
  }

  #reject(socket, status, message) {
    try {
      const body = `${message}\n`;
      socket.write(`HTTP/1.1 ${status} Forbidden\r\nconnection: close\r\ncontent-type: text/plain\r\ncontent-length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    } catch { /* ignore */ }
    socket.destroy();
  }

  #onFrame(state, text) {
    const outer = parseFrame(text);
    if (!outer) return;
    if (!state.authenticated) {
      if (outer.type !== 'auth.proof') return;
      if (!verifyJoinProof(this.instance, state.nonce, String(outer.proof ?? ''))) {
        sendJson(state.conn, { type: 'auth.error', message: 'proof 不匹配' });
        try { state.conn.close(1000, 'auth failed'); } catch { state.conn.destroy(); }
        return;
      }
      const peerId = String(outer.peerId ?? '').trim();
      const peer = this.peers.list().find((item) => item.peerId === peerId && item.relation === 'child');
      if (!peer) {
        sendJson(state.conn, { type: 'auth.error', message: '只有直接子节点可以使用代理' });
        try { state.conn.close(1000, 'not a child'); } catch { state.conn.destroy(); }
        return;
      }
      state.peerId = peerId;
      state.authenticated = true;
      clearTimeout(state.timer);
      state.key = deriveSessionKey(String(this.instance.passwordHash), state.nonce);
      sendJson(state.conn, { type: 'auth.ok', peerId });
      return;
    }
    if (!outer.enc) return;
    let frame;
    try { frame = openSealed(state.key, outer.enc); } catch { return; }
    if (frame.type === 'connect') {
      void this.#connect(state, String(frame.host ?? ''), Number(frame.port));
      return;
    }
    if (frame.type === 'data') {
      if (!state.target) return;
      const chunk = Buffer.from(String(frame.data ?? ''), 'base64');
      if (chunk.length) state.target.write(chunk);
      return;
    }
    if (frame.type === 'close') {
      this.#dispose(state);
    }
  }

  async #connect(state, host, port) {
    if (!state.authenticated || !state.key) return;
    if (state.target) return;
    const config = this.resolveConfig();
    if (!config.proxyEnabled) {
      sendSealed(state.conn, state.key, { type: 'error', message: '主端代理已关闭' });
      this.#dispose(state);
      return;
    }
    let target;
    try {
      const ports = Array.isArray(config.proxyAllowedPorts) && config.proxyAllowedPorts.length
        ? config.proxyAllowedPorts.map(Number).filter(Number.isInteger)
        : DEFAULT_PROXY_PORTS;
      target = await resolveProxyTarget({
        host,
        port,
        allowHosts: parseAllowHosts(config.proxyAllowHosts),
        allowPrivate: config.proxyAllowPrivate,
        allowedPorts: ports,
      });
    } catch (error) {
      sendSealed(state.conn, state.key, { type: 'error', message: String(error?.message ?? error) });
      this.#dispose(state);
      return;
    }
    const socket = netConnect({ host: target.address, port: target.port, family: target.family });
    state.target = socket;
    const timer = setTimeout(() => {
      if (!socket.connecting) return;
      sendSealed(state.conn, state.key, { type: 'error', message: '目标连接超时' });
      socket.destroy();
      this.#dispose(state);
    }, CONNECT_TIMEOUT_MS);
    timer.unref?.();
    socket.on('connect', () => {
      clearTimeout(timer);
      sendSealed(state.conn, state.key, { type: 'connected', host: target.host, port: target.port });
    });
    socket.on('data', (chunk) => {
      if (state.conn.bufferedAmount > CHUNK_LIMIT) {
        socket.pause();
        const resume = () => {
          state.conn.off?.('drain', resume);
          socket.resume();
        };
        state.conn.on?.('drain', resume);
        return;
      }
      sendSealed(state.conn, state.key, { type: 'data', data: Buffer.from(chunk).toString('base64') });
    });
    socket.on('error', (error) => {
      clearTimeout(timer);
      if (state.key) sendSealed(state.conn, state.key, { type: 'error', message: String(error?.message ?? error) });
      this.#dispose(state);
    });
    socket.on('close', () => {
      clearTimeout(timer);
      if (state.key) sendSealed(state.conn, state.key, { type: 'close' });
      this.#dispose(state);
    });
  }

  #dispose(state) {
    if (state.disposed) return;
    state.disposed = true;
    clearTimeout(state.timer);
    if (state.target) {
      try { state.target.destroy(); } catch { /* ignore */ }
      state.target = null;
    }
    try { state.conn.close(1000, 'proxy closed'); } catch { state.conn.destroy(); }
    this.tunnels.delete(state);
  }

  dispose() {
    for (const state of [...this.tunnels]) this.#dispose(state);
  }

  stats() {
    return { enabled: Boolean(this.resolveConfig().proxyEnabled), connections: this.tunnels.size };
  }
}
