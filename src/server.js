/**
 * dsh-cow 的宿主 HTTP 面：只保留健康检查与 WebSocket 升级；任务/通讯全部走 WS。
 */
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { ROUTE_PREFIX } from './protocol.js';

import { timingSafeEqual } from 'node:crypto';

function safeEqual(a, b) {
  const left = Buffer.from(String(a ?? ''));
  const right = Buffer.from(String(b ?? ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

async function readJsonBody(req, limit = 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('请求体过大');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
  });
  res.end(text);
}

export function createHandler({ channel, info, api, packages }) {
  return async function handler(req, res) {
    let url;
    try {
      url = new URL(req.url ?? '/', 'http://cow.local');
    } catch {
      sendJson(res, 400, { error: { code: 'invalid_request', message: '无法解析请求 URL' } });
      return;
    }
    const pathname = url.pathname;
    if (pathname === `${ROUTE_PREFIX}/health`) {
      sendJson(res, 200, {
        ok: true,
        protocol: 'cow/v1',
        peerId: info?.peerId ?? '',
        displayName: info?.displayName ?? '',
        version: info?.version ?? '',
        connections: channel?.connectedCount?.() ?? 0,
      });
      return;
    }
    if (pathname === `${ROUTE_PREFIX}/plugin/package` && req.method === 'GET') {
      const item = packages?.download?.();
      if (!item) {
        sendJson(res, 404, { error: { code: 'package_not_found', message: '插件包不存在或下载链接已过期' } });
        return;
      }
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': item.buffer.length,
        'content-disposition': `attachment; filename="${item.filename}"`,
        'cache-control': 'no-store',
        'x-cow-package': `${item.name}@${item.version}`,
        'x-cow-sha256': item.sha256,
      });
      res.end(item.buffer);
      return;
    }
    if (pathname.startsWith(`${ROUTE_PREFIX}/files/`) || pathname === `${ROUTE_PREFIX}/status`) {
      if (!api?.token || !safeEqual(req.headers?.['x-cow-token'], api.token)) {
        sendJson(res, 401, { error: { code: 'unauthorized', message: '需要本机 cow 管理令牌（$DSH_HOME/cow/http.token）' } });
        return;
      }
      try {
        if (pathname === `${ROUTE_PREFIX}/status` && req.method === 'GET') {
          sendJson(res, 200, await api.status());
          return;
        }
        if (pathname === `${ROUTE_PREFIX}/files/send` && req.method === 'POST') {
          const body = await readJsonBody(req);
          sendJson(res, 200, await api.sendFile(body));
          return;
        }
        if (pathname === `${ROUTE_PREFIX}/files/receive` && req.method === 'POST') {
          const body = await readJsonBody(req);
          sendJson(res, 200, await api.receiveFile(body));
          return;
        }
        sendJson(res, 404, { error: { code: 'not_found', message: `未知端点：${pathname}` } });
      } catch (error) {
        sendJson(res, 400, { error: { code: 'file_transfer_failed', message: String(error?.message ?? error) } });
      }
      return;
    }
    if (pathname === `${ROUTE_PREFIX}/ws` || pathname === `${ROUTE_PREFIX}/channel`) {
      sendJson(res, 426, { error: { code: 'upgrade_required', message: '该端点只接受 WebSocket 升级' } });
      return;
    }
    sendJson(res, 404, { error: { code: 'not_found', message: `未知端点：${pathname}` } });
  };
}

/**
 * 挂载路由：优先复用宿主 webServer，`listenPort > 0` 时另起独立监听。
 * @returns {{dispose: () => void, endpoint: () => string}}
 */
/** 取第一个非内网 IPv4，用于「仅本机监听」关闭时生成对端可达的地址。 */
function firstLanIPv4() {
  try {
    const interfaces = networkInterfaces();
    for (const list of Object.values(interfaces)) {
      for (const item of list ?? []) {
        if (item && item.family === 'IPv4' && item.internal === false) return item.address;
      }
    }
  } catch {
    /* 忽略 */
  }
  return '';
}

/**
 * 挂载路由与可选独立监听。
 *   - `/cow/v1/*` 与 WebSocket 升级挂到宿主 webServer（只注册一次）；
 *   - `listenPort > 0` 时另起独立监听，可以随设置变更 `restart()`（端口/监听地址改动即时生效）。
 */
export function mountCarrier({ ctx, handler, upgrade, config, logger }) {
  const log = logger ?? console;
  let settings = { ...config };
  let ownServer = null;
  let ownOrigin = '';
  let hostOrigin = '';
  let disposed = false;

  const startOwn = () => {
    if (disposed || !(settings.listenPort > 0) || ownServer) return;
    try {
      const server = createServer((req, res) => void handler(req, res));
      server.on('error', (error) => log.error?.(`[dsh-cow] 监听 ${settings.listenHost}:${settings.listenPort} 失败: ${error?.message ?? error}`));
      server.on('upgrade', (req, socket, head) => {
        try {
          const pathname = new URL(req.url ?? '/', 'http://cow.local').pathname;
          if (upgrade && pathname === upgrade.path) {
            void upgrade.handler(req, socket, head);
            return;
          }
        } catch {
          /* 落到 destroy */
        }
        socket.destroy();
      });
      server.listen(settings.listenPort, settings.listenHost, () => {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : settings.listenPort;
        const wildcard = settings.listenHost === '0.0.0.0' || settings.listenHost === '::';
        const host = wildcard ? firstLanIPv4() || '127.0.0.1' : settings.listenHost;
        ownOrigin = `http://${host.includes(':') ? `[${host}]` : host}:${port}`;
        log.info?.(`[dsh-cow] 独立监听 ${settings.listenHost}:${port}，端点 ${ownOrigin}${ROUTE_PREFIX}`);
      });
      ownServer = server;
    } catch (error) {
      log.error?.(`[dsh-cow] 无法创建独立监听: ${error?.message ?? error}`);
    }
  };

  const stopOwn = () => {
    const server = ownServer;
    ownServer = null;
    ownOrigin = '';
    try {
      server?.close();
    } catch {
      /* 忽略 */
    }
  };

  startOwn();

  try {
    ctx.inject(['webServer'], (sctx) => {
      try {
        const webServer = sctx.get('webServer', false);
        if (!webServer?.register) return;
        sctx.effect(() => {
          const disposers = [];
          disposers.push(webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler }));
          if (upgrade && typeof webServer.registerUpgrade === 'function') {
            disposers.push(webServer.registerUpgrade({ path: upgrade.path, handler: upgrade.handler }));
          }
          try {
            hostOrigin = webServer.getOrigin?.() ?? '';
          } catch {
            hostOrigin = '';
          }
          return () => {
            for (const dispose of disposers) {
              try {
                dispose();
              } catch {
                /* 忽略 */
              }
            }
          };
        }, 'dsh-cow: routes');
      } catch (error) {
        log.warn?.(`[dsh-cow] 挂载到 webServer 失败: ${error?.message ?? error}`);
      }
    });
  } catch {
    /* 没有 webServer 服务时会一直等待，不影响独立监听 */
  }

  return {
    endpoint() {
      const origin = ownOrigin || hostOrigin;
      return origin ? `${origin}${ROUTE_PREFIX}` : '';
    },
    /** 设置页改了开放端口 / 仅本机监听时重建独立监听。 */
    restart(next = {}) {
      if (disposed) return;
      const nextHost = next.listenHost ?? settings.listenHost;
      const nextPort = next.listenPort ?? settings.listenPort;
      const changed = nextHost !== settings.listenHost || Number(nextPort) !== Number(settings.listenPort);
      settings = { ...settings, ...next };
      // 只有监听地址/端口真的变了才重建监听；保存密码、任务、询问等设置不踢掉现有连接。
      if (!changed) return;
      stopOwn();
      startOwn();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopOwn();
    },
  };
}
