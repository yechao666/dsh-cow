/**
 * 设置页的宿主 API（浏览器同源调用）：`/api/cow/*`。
 * 只负责读取状态、保存配置与回答询问；通讯全部走 WebSocket 消息。
 */
import { DEFAULT_ALLOWED_ROOT } from './config.js';

const MAX_BODY = 64 * 1024;

/** 仅当 a 严格低于 b 时返回 true（x.y.z 数字比较）。 */
function versionLess(a, b) {
  const pa = String(a ?? '').replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b ?? '').replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
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

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function wrap(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      sendJson(res, 500, { error: { code: 'internal', message: String(error?.message ?? error) } });
    }
  };
}

export function createAdminHandlers(deps) {
  const state = () => {
    const cfg = deps.resolveConfig();
    const installedVersion = String(typeof deps.installedVersion === 'function' ? deps.installedVersion() : deps.installedVersion ?? deps.pluginVersion ?? '');
    const currentVersion = installedVersion;
    const connections = deps.channel?.connections?.() ?? [];
    const peerList = deps.peers.list().map((peer) => {
      const status = deps.channel?.status?.(peer.label) ?? { state: 'offline' };
      return {
        peerName: peer.label,
        peerId: peer.peerId ?? '',
        uuid: peer.uuid || status.node?.uuid || '',
        relation: peer.relation ?? 'peer',
        connected: status.state === 'connected',
        direction: status.direction ?? null,
        node: status.node ?? null,
        version: status.node?.version ?? '',
        upgradeAvailable: peer.relation === 'child'
          && status.state === 'connected'
          && Boolean(status.node?.version)
          && versionLess(status.node.version, currentVersion),
        encrypted: status.e2e === true,
        description: status.node?.description ?? peer.capabilitySummary ?? '',
      };
    });
    const pendingAsks = deps.router?.pending?.() ?? [];
    return {
      instance: {
        peerId: deps.instance.peerId,
        uuid: deps.instance.uuid ?? '',
        displayName: cfg.displayName || deps.instance.displayName || '',
        version: deps.pluginVersion ?? '',
        installedVersion,
        description: deps.instance.description ?? '',
        role: deps.instance.role ?? 'leader',
        parent: deps.instance.parent ?? null,
        endpoint: deps.getEndpoint?.() ?? '',
      },
      config: {
        displayName: cfg.displayName ?? '',
        capabilityNote: cfg.capabilityNote ?? '',
        allowedRoots: cfg.allowedRoots ?? '',
        listenHost: cfg.listenHost ?? '127.0.0.1',
        listenPort: cfg.listenPort ?? 0,
        maxFileMB: Number.isFinite(cfg.maxFileMB) ? cfg.maxFileMB : 50,
        maxConcurrentFiles: Number.isFinite(cfg.maxConcurrentFiles) ? cfg.maxConcurrentFiles : 4,
        agentPreset: cfg.agentPreset ?? '',
        proxyEnabled: Boolean(cfg.proxyEnabled),
        proxyAllowHosts: cfg.proxyAllowHosts ?? '',
        proxyAllowPrivate: Boolean(cfg.proxyAllowPrivate),
        proxyViaParent: Boolean(cfg.proxyViaParent),
        proxyLogLimit: cfg.proxyLogLimit ?? 50,
      },
      pluginVersion: deps.pluginVersion ?? '',
      installedVersion,
      defaultAllowedRoot: DEFAULT_ALLOWED_ROOT,
      passwordConfigured: deps.passwordConfigured?.() ?? false,
      proxy: typeof deps.proxyStatus === 'function' ? deps.proxyStatus() : null,
      peers: peerList,
      connections,
      pendingAsks,
      parent: {
        url: deps.instance.parentUrl ?? '',
        connected: peerList.some((item) => item.relation === 'parent' && item.connected),
        node: peerList.find((item) => item.relation === 'parent')?.node ?? null,
      },
      stats: {
        peers: peerList.length,
        connected: peerList.filter((item) => item.connected).length,
        encrypted: peerList.filter((item) => item.encrypted).length,
        pendingAsks: pendingAsks.length,
      },
    };
  };

  return {
    '/api/cow/state': wrap(async (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET' } });
      sendJson(res, 200, state());
    }),

    '/api/cow/settings': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const patch = body?.patch && typeof body.patch === 'object' ? body.patch : body;
      if (Object.prototype.hasOwnProperty.call(patch, 'allowedRoots')
        && String(patch.allowedRoots ?? '').trim() === '') {
        patch.allowedRoots = DEFAULT_ALLOWED_ROOT;
      }
      deps.saveSettings(patch);
      await deps.applySettings?.();
      sendJson(res, 200, state());
    }),

    '/api/cow/password': wrap(async (req, res) => {
      if (req.method === 'GET') return sendJson(res, 200, { configured: deps.passwordConfigured?.() ?? false });
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET/POST' } });
      const body = await readBody(req);
      const password = String(body?.password ?? '');
      if (password.length < 12) return sendJson(res, 400, { error: { code: 'password_too_short', message: '连接密码至少 12 个字符（推荐直接生成随机密钥）' } });
      deps.setPassword(password);
      sendJson(res, 200, { configured: true });
    }),

    '/api/cow/parent': wrap(async (req, res) => {
      if (req.method === 'GET') {
        return sendJson(res, 200, { url: deps.instance.parentUrl ?? '', password: deps.getParentPassword?.() ?? '' });
      }
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET/POST' } });
      const body = await readBody(req);
      const url = String(body?.url ?? '').trim();
      const password = String(body?.password ?? '');
      if (url && !/^https?:|^wss?:/i.test(url)) {
        return sendJson(res, 400, { error: { code: 'invalid_request', message: '上级地址必须是 http(s):// 或 ws(s):// URL' } });
      }
      deps.saveParentAuth?.({ url, password });
      sendJson(res, 200, { url, passwordConfigured: Boolean(password) });
    }),

    '/api/cow/activity': wrap(async (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET' } });
      const limit = Math.max(1, Math.min(200, Number(new URL(req.url ?? '/', 'http://cow.local').searchParams.get('limit')) || 100));
      const items = deps.activity?.list?.(limit) ?? [];
      sendJson(res, 200, {
        items,
        stats: {
          total: items.length,
          connected: (deps.channel?.connections?.() ?? []).filter((item) => item.ready).length,
          encrypted: (deps.channel?.connections?.() ?? []).filter((item) => item.e2e).length,
          pendingAsks: (deps.router?.pending?.() ?? []).length,
        },
      });
    }),

    '/api/cow/answer': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const questionId = String(body?.questionId ?? '').trim();
      const answer = String(body?.answer ?? '');
      if (!questionId) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 questionId' } });
      try {
        const ask = (deps.router.pending?.() ?? []).find((item) => item.questionId === questionId);
        const answered = deps.router.answer(questionId, answer);
        deps.activity?.add?.({
          kind: 'message',
          text: `回答 ${questionId}：${answer.slice(0, 80)}`,
          peerName: ask?.peerName ?? '',
          from: deps.instance.displayName || deps.instance.peerId,
          to: ask?.peer ?? '',
          messageId: questionId,
          status: answered?.status ?? 'sent',
        });
        sendJson(res, 200, state());
      } catch (error) {
        sendJson(res, 409, { error: { code: 'answer_failed', message: String(error?.message ?? error) } });
      }
    }),

    '/api/cow/package': wrap(async (req, res) => {
      if (req.method !== 'GET') {
        sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET' } });
        return;
      }
      const item = deps.packages?.build?.();
      if (!item) {
        sendJson(res, 404, { error: { code: 'package_not_found', message: '当前没有可下载的插件包' } });
        return;
      }
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': item.buffer.length,
        'content-disposition': `attachment; filename="dsh-cow-${item.version}.tgz"`,
        'cache-control': 'no-store',
        'x-cow-package': `${item.name}@${item.version}`,
        'x-cow-sha256': item.sha256,
      });
      res.end(item.buffer);
    }),
    '/api/cow/doctor': wrap(async (req, res) => {
      if (req.method !== 'GET') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 GET' } });
      if (!deps.doctor) return sendJson(res, 503, { error: { code: 'unavailable', message: '诊断不可用' } });
      const { path, report } = deps.doctor();
      sendJson(res, 200, { path, report });
    }),

    '/api/cow/peers/remove': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const peerName = String(body?.peerName ?? body?.label ?? '').trim();
      if (!peerName) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 peerName' } });
      deps.peers.remove(peerName);
      sendJson(res, 200, state());
    }),
  };
}
