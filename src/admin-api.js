/**
 * 设置页的宿主 API（浏览器同源调用）：`/api/cow/*`。
 * 只负责读取状态与保存配置；通讯与任务全部走 WebSocket。
 */
import { DEFAULT_ALLOWED_ROOT } from './config.js';

const MAX_BODY = 64 * 1024;

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
    const connections = deps.channel?.connections?.() ?? [];
    const peerList = deps.peers.list().map((peer) => {
      const status = deps.channel?.status?.(peer.label) ?? { state: 'offline' };
      return {
        label: peer.label,
        peer: peer.label,
        instanceId: peer.instanceId ?? '',
        uuid: peer.uuid || status.node?.uuid || '',
        relation: peer.relation ?? 'peer',
        connected: status.state === 'connected',
        direction: status.direction ?? null,
        node: status.node ?? null,
        version: status.node?.version ?? '',
        encrypted: status.e2e === true,
        description: status.node?.description ?? peer.capabilitySummary ?? '',
        currentTask: deps.currentTaskFor?.(peer.label) ?? null,
      };
    });
    return {
      instance: {
        instanceId: deps.instance.instanceId,
        uuid: deps.instance.uuid ?? '',
        displayName: cfg.displayName || deps.instance.displayName || '',
        version: deps.pluginVersion ?? '',
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
      },
      pluginVersion: deps.pluginVersion ?? '',
      defaultAllowedRoot: DEFAULT_ALLOWED_ROOT,
      passwordConfigured: deps.passwordConfigured?.() ?? false,
      peers: peerList,
      connections,
      tasks: deps.tasks?.list?.() ?? [],
      currentInbound: deps.currentInbound?.() ?? null,
      parent: {
        url: deps.instance.parentUrl ?? '',
        connected: peerList.some((item) => item.relation === 'parent' && item.connected),
        node: peerList.find((item) => item.relation === 'parent')?.node ?? null,
      },
      stats: {
        peers: peerList.length,
        connected: peerList.filter((item) => item.connected).length,
        tasks: deps.tasks?.list?.().length ?? 0,
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

    '/api/cow/delegate': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const peer = String(body?.peer ?? '').trim();
      const prompt = String(body?.prompt ?? '').trim();
      if (!peer || !prompt) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 peer 或 prompt' } });
      const waitSeconds = Math.max(0, Math.min(600, Number(body?.waitSeconds ?? 120) || 0));
      try {
        const created = deps.tasks.assign({
          peer,
          prompt,
          cwd: String(body?.cwd ?? ''),
          title: String(body?.title ?? ''),
          timeoutSec: Number(body?.timeoutSec) || 3600,
        });
        const deadline = Date.now() + waitSeconds * 1000;
        let snapshot = deps.tasks.get(created.taskId);
        while (snapshot && !['succeeded', 'failed', 'canceled'].includes(snapshot.status) && Date.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          snapshot = deps.tasks.get(created.taskId);
        }
        sendJson(res, 200, snapshot ? deps.tasks.snapshot(snapshot) : created);
      } catch (error) {
        sendJson(res, 409, { error: { code: 'task_failed', message: String(error?.message ?? error) } });
      }
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
          queued: (deps.tasks?.list?.() ?? []).filter((task) => task.status === 'queued').length,
        },
      });
    }),

    '/api/cow/upgrade': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const peer = String(body?.peer ?? '').trim();
      if (!peer) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 peer' } });
      try {
        if (!deps.upgrade) throw new Error('升级服务未启用');
        sendJson(res, 200, await deps.upgrade.upgradePeer(peer, { targetVersion: String(body?.targetVersion ?? '') }));
      } catch (error) {
        sendJson(res, 400, { error: { code: 'upgrade_failed', message: String(error?.message ?? error) } });
      }
    }),

    '/api/cow/cancel': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const taskId = String(body?.taskId ?? '').trim();
      if (!taskId) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 taskId' } });
      try {
        deps.tasks.cancel(taskId, String(body?.reason ?? '配置页取消'));
        sendJson(res, 200, state());
      } catch (error) {
        sendJson(res, 409, { error: { code: 'cancel_failed', message: String(error?.message ?? error) } });
      }
    }),

    '/api/cow/answer': wrap(async (req, res) => {
      if (req.method !== 'POST') return sendJson(res, 405, { error: { code: 'method_not_allowed', message: '只支持 POST' } });
      const body = await readBody(req);
      const taskId = String(body?.taskId ?? '').trim();
      const answer = String(body?.answer ?? '');
      if (!taskId) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 taskId' } });
      try {
        deps.tasks.answer(taskId, answer);
        sendJson(res, 200, state());
      } catch (error) {
        sendJson(res, 409, { error: { code: 'answer_failed', message: String(error?.message ?? error) } });
      }
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
      const label = String(body?.label ?? '').trim();
      if (!label) return sendJson(res, 400, { error: { code: 'invalid_request', message: '缺少 label' } });
      deps.peers.remove(label);
      sendJson(res, 200, state());
    }),
  };
}
