/**
 * 子端本地 HTTP(S) 代理：只监听 127.0.0.1，把连接交给 COW 加密隧道。
 * DSH、curl、git、npm 等只需要把 HTTP_PROXY/HTTPS_PROXY 指到这里。
 */
import { createServer, request as httpRequest } from 'node:http';
import { openProxyTunnel } from './net-tunnel.js';

function parseAuthority(value, defaultPort = 80) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('缺少代理目标');
  if (text.startsWith('[')) {
    const end = text.indexOf(']');
    if (end < 0) throw new Error('IPv6 代理目标格式错误');
    const host = text.slice(1, end);
    const rest = text.slice(end + 1);
    const port = rest.startsWith(':') ? Number(rest.slice(1)) : defaultPort;
    return { host, port };
  }
  const index = text.lastIndexOf(':');
  if (index > 0 && /^\d+$/.test(text.slice(index + 1))) {
    return { host: text.slice(0, index), port: Number(text.slice(index + 1)) };
  }
  return { host: text, port: defaultPort };
}

function targetFromUrl(raw, headers) {
  const value = String(raw ?? '');
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    return {
      url,
      host: url.hostname,
      port: Number(url.port) || (url.protocol === 'https:' ? 443 : 80),
      path: `${url.pathname}${url.search}`,
    };
  }
  const hostHeader = String(headers?.host ?? '');
  const { host, port } = parseAuthority(hostHeader, 80);
  return { url: null, host, port, path: value.startsWith('/') ? value : `/${value}` };
}

function sendError(socket, status, message) {
  try {
    const body = `${message}\n`;
    socket.write(`HTTP/1.1 ${status} Bad Gateway\r\nconnection: close\r\ncontent-type: text/plain\r\ncontent-length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
    socket.destroy();
  } catch { /* ignore */ }
}

export class LocalProxy {
  constructor({ getParent, logger }) {
    this.getParent = getParent;
    this.logger = logger ?? console;
    this.server = null;
    this.port = 0;
    this.stats = { opened: 0, failed: 0, active: 0 };
    this.tunnels = new Set();
  }

  async start() {
    if (this.server) return this.port;
    const server = createServer((req, res) => this.#handleHttp(req, res));
    server.on('connect', (req, socket, head) => this.#handleConnect(req, socket, head));
    server.on('clientError', (error, socket) => {
      try { socket.destroy(); } catch { /* ignore */ }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject);
        const address = server.address();
        this.port = typeof address === 'object' && address ? address.port : 0;
        resolve();
      });
    });
    this.server = server;
    this.logger.info?.(`[dsh-cow] 本地代理监听 127.0.0.1:${this.port}`);
    return this.port;
  }

  async stop() {
    const server = this.server;
    this.server = null;
    this.port = 0;
    for (const tunnel of this.tunnels) {
      try { tunnel.destroy(); } catch { /* ignore */ }
    }
    this.tunnels.clear();
    if (server) {
      await new Promise((resolve) => {
        try { server.close(() => resolve()); } catch { resolve(); }
        setTimeout(resolve, 1000).unref?.();
      });
    }
    this.stats.active = 0;
  }

  #parent() {
    const parent = this.getParent?.() ?? null;
    if (!parent?.url || !parent?.password) throw new Error('主 DSH 代理未配置或离线');
    return parent;
  }

  async #tunnel(host, port) {
    const parent = this.#parent();
    this.stats.opened += 1;
    this.stats.active += 1;
    try {
      return await openProxyTunnel({
        parentUrl: parent.url,
        password: parent.password,
        peerId: parent.peerId || '',
        host,
        port,
      });
    } catch (error) {
      this.stats.failed += 1;
      this.stats.active = Math.max(0, this.stats.active - 1);
      throw error;
    }
  }

  async #handleConnect(req, socket, head) {
    let target;
    try {
      target = parseAuthority(req.url, 443);
    } catch (error) {
      sendError(socket, 400, String(error?.message ?? error));
      return;
    }
    try {
      const tunnel = await this.#tunnel(target.host, target.port);
      this.tunnels.add(tunnel);
      tunnel.once('close', () => {
        this.tunnels.delete(tunnel);
        this.stats.active = Math.max(0, this.stats.active - 1);
      });
      socket.write('HTTP/1.1 200 Connection Established\r\nproxy-agent: dsh-cow\r\n\r\n');
      if (head?.length) tunnel.write(head);
      socket.pipe(tunnel).pipe(socket);
      tunnel.on('error', () => socket.destroy());
      socket.on('error', () => tunnel.destroy());
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 代理 CONNECT 失败 ${target.host}:${target.port}：${error?.message ?? error}`);
      sendError(socket, 502, String(error?.message ?? error));
    }
  }

  async #handleHttp(req, res) {
    let target;
    try {
      target = targetFromUrl(req.url, req.headers);
    } catch (error) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(error?.message ?? error));
      return;
    }
    try {
      const tunnel = await this.#tunnel(target.host, target.port);
      this.tunnels.add(tunnel);
      tunnel.once('close', () => {
        this.tunnels.delete(tunnel);
        this.stats.active = Math.max(0, this.stats.active - 1);
      });
      const headers = { ...req.headers };
      delete headers['proxy-connection'];
      delete headers['proxy-authorization'];
      headers.host = target.url ? target.url.host : `${target.host}${target.port === 80 ? '' : `:${target.port}`}`;
      const upstream = httpRequest({
        host: target.host,
        port: target.port,
        method: req.method,
        path: target.path,
        headers,
        createConnection: () => tunnel,
      });
      upstream.on('response', (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers);
        response.pipe(res);
      });
      upstream.on('error', (error) => {
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(String(error?.message ?? error));
        tunnel.destroy();
      });
      req.pipe(upstream);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 代理 HTTP 失败 ${target.host}:${target.port}：${error?.message ?? error}`);
      if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(String(error?.message ?? error));
    }
  }

  status() {
    return { running: Boolean(this.server), port: this.port, ...this.stats };
  }
}
