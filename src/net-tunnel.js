/**
 * 子端到主端的加密代理隧道（一条 WebSocket 承载一个 TCP 流）。
 *
 * 这不是 COW 消息队列：代理数据走独立的 /cow/v1/net 连接，避免大流量挤占
 * dispatch/complete 的 ack/outbox。握手复用 COW 的密码挑战，帧用同一套
 * AES-256-GCM 密封；每条隧道只承载一个目标 TCP 连接，生命周期短、状态少。
 */
import { Duplex } from 'node:stream';
import { hashJoinPassword, makeJoinProof } from './identity.js';
import { connect as wsConnect } from './ws.js';
import { deriveSessionKey, open as openSealed, seal } from './crypto.js';
import { ROUTE_PREFIX } from './protocol.js';

const DEFAULT_TIMEOUT = 15_000;

/** 把父节点 channel 地址换成 net 地址。 */
export function proxyUrlForParent(parentUrl) {
  const url = new URL(String(parentUrl ?? ''));
  url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
  let path = url.pathname.replace(/\/+$/, '');
  if (path.endsWith('/channel')) path = path.slice(0, -'/channel'.length);
  if (!path.endsWith('/net')) path = `${path}/net`;
  url.pathname = path;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function sendJson(conn, value) {
  return conn.send(JSON.stringify(value));
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

function authenticate(conn, { password, peerId, timeoutMs }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('代理握手超时'));
    }, timeoutMs);
    timer.unref?.();

    const finish = (error, key) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      if (error) reject(error);
      else resolve(key);
    };
    const onMessage = (text) => {
      const frame = parseFrame(text);
      if (!frame) return;
      if (frame.type === 'auth.challenge') {
        try {
          const verifier = hashJoinPassword(String(password ?? ''), String(frame.salt ?? ''));
          const proof = makeJoinProof(verifier, String(frame.nonce ?? ''));
          const key = deriveSessionKey(verifier, String(frame.nonce ?? ''));
          sendJson(conn, { type: 'auth.proof', peerId, proof });
          // 服务器验证 proof 后会回 auth.ok；密钥在本地已经可以算出来。
          conn.__cowProxyKey = key;
        } catch (error) {
          finish(error);
        }
        return;
      }
      if (frame.type === 'auth.ok') {
        finish(null, conn.__cowProxyKey ?? null);
        return;
      }
      if (frame.type === 'auth.error' || frame.type === 'bye') {
        finish(new Error(String(frame.message ?? frame.reason ?? '代理认证失败')));
      }
    };
    const onError = (error) => finish(error instanceof Error ? error : new Error(String(error)));
    const onClose = () => finish(new Error('代理连接在握手阶段关闭'));
    const cleanup = () => {
      try { offMessage(); } catch { /* ignore */ }
      try { offError(); } catch { /* ignore */ }
      try { offClose(); } catch { /* ignore */ }
    };
    // Register before cleanup is called; `off*` are assigned below.
    const offMessage = conn.on('message', onMessage);
    const offError = conn.on('error', onError);
    const offClose = conn.on('close', onClose);
  });
}

/**
 * 子端代理数据流。实现 Duplex，方便 CONNECT 直接 pipe，也方便 http.request
 * 用 createConnection 接上来。
 */
export class NetTunnel extends Duplex {
  constructor(conn, key, { host, port }) {
    super({ allowHalfOpen: false });
    this.conn = conn;
    this.key = key;
    this.target = { host, port };
    this.isClosed = false;
    this.on('finish', () => this.close());
    this.offMessage = conn.on('message', (text) => this.#onMessage(text));
    this.offError = conn.on('error', (error) => this.destroy(error instanceof Error ? error : new Error(String(error))));
    this.offClose = conn.on('close', () => {
      if (!this.isClosed) this.push(null);
      this.isClosed = true;
    });
  }

  #onMessage(text) {
    const outer = parseFrame(text);
    if (!outer?.enc) return;
    let frame;
    try { frame = openSealed(this.key, outer.enc); } catch { return; }
    if (frame.type === 'data') {
      const data = Buffer.from(String(frame.data ?? ''), 'base64');
      if (data.length && !this.push(data)) {
        // WebSocket 没有暂停 API；上层 socket 的背压由 Duplex 的 highWaterMark 限制。
      }
      return;
    }
    if (frame.type === 'close') {
      this.push(null);
      this.close();
      return;
    }
    if (frame.type === 'error') {
      this.destroy(new Error(String(frame.message ?? '代理目标错误')));
    }
  }

  _read() {}

  _write(chunk, _encoding, callback) {
    if (this.isClosed) { callback(new Error('代理隧道已关闭')); return; }
    const ok = sendSealed(this.conn, this.key, { type: 'data', data: Buffer.from(chunk).toString('base64') });
    if (ok) { callback(); return; }
    // ws wrapper sends on a plain TCP socket; wait for drain if it backpressures.
    let done = false;
    let off = null;
    const finish = () => {
      if (done) return;
      done = true;
      try { off?.(); } catch { /* ignore */ }
      callback();
    };
    off = this.conn.on?.('drain', finish) ?? null;
    setTimeout(finish, 1000).unref?.();
  }

  _final(callback) {
    try { sendSealed(this.conn, this.key, { type: 'close' }); } catch { /* ignore */ }
    this.close();
    callback();
  }

  close() {
    if (this.isClosed) return;
    this.isClosed = true;
    try { this.conn.close(1000, 'tunnel closed'); } catch { this.conn.destroy(); }
    try { this.offMessage?.(); this.offError?.(); this.offClose?.(); } catch { /* ignore */ }
    if (!this.readableEnded) this.push(null);
  }

  setTimeout() { return this; }
  setNoDelay() { return this; }
  setKeepAlive() { return this; }
  ref() { return this; }
  unref() { return this; }
}

/**
 * 建立一条子端 → 主端的代理 TCP 流。
 * @param {{parentUrl: string, password: string, peerId: string, host: string, port: number, timeoutMs?: number}} options
 * @returns {Promise<NetTunnel>}
 */
export async function openProxyTunnel({ parentUrl, password, peerId, host, port, chain = [], timeoutMs = DEFAULT_TIMEOUT }) {
  if (!parentUrl) throw new Error('未配置上级地址');
  if (!password) throw new Error('未配置上级连接密码');
  const url = proxyUrlForParent(parentUrl);
  const conn = await wsConnect({ url, timeoutMs });
  try {
    const key = await authenticate(conn, { password, peerId, timeoutMs });
    if (!key) throw new Error('代理握手没有拿到会话密钥');
    sendSealed(conn, key, { type: 'connect', host, port, chain: Array.isArray(chain) ? chain.map(String) : [] });
    const response = await new Promise((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        offMessage?.();
        reject(new Error('代理目标连接超时'));
      }, timeoutMs);
      timer.unref?.();
      const offMessage = conn.on('message', (text) => {
        const outer = parseFrame(text);
        if (!outer?.enc) return;
        let frame;
        try { frame = openSealed(key, outer.enc); } catch { return; }
        if (settled) return;
        if (frame.type === 'connected') {
          settled = true;
          clearTimeout(timer);
          offMessage?.();
          resolve();
        } else if (frame.type === 'error') {
          settled = true;
          clearTimeout(timer);
          offMessage?.();
          reject(new Error(String(frame.message ?? '代理目标连接失败')));
        }
      });
      conn.on('close', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        offMessage?.();
        reject(new Error('代理连接在建立目标前关闭'));
      });
    });
    await response;
    return new NetTunnel(conn, key, { host, port });
  } catch (error) {
    try { conn.close(1000, 'proxy setup failed'); } catch { conn.destroy(); }
    throw error;
  }
}

export { ROUTE_PREFIX };
