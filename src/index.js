/**
 * dsh-cow（co-work）——多台 DSH 通过一条 WebSocket 长连接协同工作。
 *
 * 纯消息架构：没有任务、认领或任务队列。
 *   - dispatch：主 DSH 把一条消息放进子 DSH 的会话输入队列，立即返回，不轮询。
 *   - complete：子 DSH 回合结束时自动发回，主端以通知注入原会话。
 *   - ask / answer：子 DSH 向主 DSH 提问/审批，主 DSH 回答后回到同一子会话。
 * 所有业务帧都是 JSON：hello / welcome / msg.* / file.* / ping / pong。
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig, Config, SETTINGS_NAMESPACE, DEFAULT_ALLOWED_ROOT } from './config.js';
import { coDshDir, ensureDir, resolveHomeDir } from './store.js';
import { loadIdentity, patchIdentity, verifyJoinPassword, setJoinPassword } from './identity.js';
import { PeerRegistry, peersPath } from './peers.js';
import { Channel } from './channel.js';
import { createAdminHandlers } from './admin-api.js';
import { createHandler, mountCarrier } from './server.js';
import { readSettings, writeSettings } from './settings-store.js';
import { createToolDefinitions, registerTools } from './tools.js';
import { createDoctor } from './doctor.js';
import { registerApprovalTakeover } from './approval-takeover.js';
import { ActivityLog } from './activity.js';
import { FileExchange } from './files.js';
import { normalizeRoots } from './paths.js';
import { buildMachineDescription } from './machine-profile.js';
import { MessageBridge } from './message-bridge.js';
import { MessageRouter } from './message-router.js';
import { resolveChildCwd, sessionInfo } from './session-info.js';
import { PROTOCOL_VERSION, ROUTE_PREFIX } from './protocol.js';

const PACKAGE = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  } catch {
    return { name: 'dsh-cow', version: '0.0.0' };
  }
})();

/** 插件热重载时 ESM 模块会缓存 PACKAGE，这里每次重新读磁盘版本。 */
function currentPackageVersion() {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
  } catch {
    return PACKAGE.version;
  }
}

export const name = 'dsh-cow';
export const inject = [];
export { Config, resolveConfig } from './config.js';
export { PROTOCOL_VERSION, ROUTE_PREFIX } from './protocol.js';

function consoleLogger() {
  return {
    info: (msg) => console.info(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg),
    debug: () => {},
  };
}

export function apply(ctx, rawConfig = {}) {
  if (process.env.DSH_COW_DISABLED === '1') return;

  const logger = consoleLogger();
  const home = resolveHomeDir();
  const resolve = () => resolveConfig({ ...(rawConfig ?? {}), ...readSettings(home) });
  const service = (serviceName) => {
    try {
      return ctx.get?.(serviceName, false) ?? null;
    } catch {
      return null;
    }
  };

  let instance;
  try {
    instance = loadIdentity({ home, displayName: resolve().displayName });
  } catch (error) {
    logger.warn(`无法写入实例身份（${home}）：${error?.message ?? error}`);
    instance = { peerId: `cow_mem_${Math.random().toString(16).slice(2, 10)}`, displayName: '', role: 'leader', parent: null, createdAt: new Date().toISOString() };
  }
  instance.version = currentPackageVersion();
  if (!instance.uuid) instance.uuid = '';
  const configuredName = resolve().displayName;
  if (configuredName) instance.displayName = configuredName;

  const describe = () => {
    const cfg = resolve();
    const base = buildMachineDescription({ capabilities: [] });
    return [base, cfg.capabilityNote].filter(Boolean).join('\n').trim();
  };
  Object.defineProperty(instance, 'description', { get: describe, configurable: true });

  const peers = new PeerRegistry({ file: peersPath(home), logger });
  for (const peer of peers.list()) {
    if ((peer.peerId && peer.peerId === instance.peerId) || (peer.uuid && peer.uuid === instance.uuid)) {
      try { peers.remove(peer.label); } catch { /* 忽略 */ }
    }
  }

  const activity = new ActivityLog();
  const selfName = () => instance.displayName || instance.peerId;
  const resolveApiPeer = (body) => {
    const id = String(body?.peerId ?? '').trim();
    const name = String(body?.peerName ?? body?.peer ?? '').trim();
    if (id) {
      const found = peers.list().find((peer) => peer.peerId === id || peer.id === id);
      if (found) return found.label;
    }
    if (name) {
      const found = peers.list().find((peer) => peer.label === name);
      return found ? found.label : name;
    }
    return '';
  };
  const authorize = (password) => (verifyJoinPassword(instance, password) ? { kind: 'join', label: '' } : null);

  let carrier = null;
  let channel = null;
  let files = null;
  let bridge = null;
  let router = null;
  let doctor = null;

  const agentOf = (sessionId) => service('agents')?.get?.(sessionId) ?? null;

  const injectMessage = (sessionId, from, text, kind = 'complete') => {
    const agent = agentOf(sessionId);
    if (!agent || typeof agent.followup !== 'function') {
      logger.warn(`[dsh-cow] 找不到可注入的原会话 ${sessionId || '(空)'}，${kind} 消息未送达 Agent`);
      activity.add({ kind: 'message', text: `无法把 ${from} 的 ${kind} 消息注入原会话`, peer: from, from, to: selfName(), status: 'dropped' });
      return false;
    }
    agent.followup({
      id: randomBytes(8).toString('hex'),
      role: 'user',
      content: [{ type: 'text', text }],
      source: { kind: 'notification' },
    });
    activity.add({ kind: 'message', text: `收到 ${from} 的 ${kind} 消息，已注入原会话`, peer: from, from, to: selfName(), status: 'injected' });
    return true;
  };

  const onEvent = ({ from, peerId, event }) => {
    const type = String(event?.type ?? '');
    const payload = event?.payload ?? {};
    if (type === 'msg.dispatch') {
      void bridge.dispatch(payload, from, peerId).catch((error) => {
        logger.warn(`[dsh-cow] 处理 ${from} 的 dispatch 失败：${error?.message ?? error}`);
      });
      activity.add({ kind: 'message', text: `收到 ${from} 的 dispatch：${String(payload.text ?? '').slice(0, 80)}`, peer: from, from, to: selfName(), status: 'received' });
      return;
    }
    if (type === 'msg.answer') {
      void bridge.handleAnswer(payload, from, peerId).catch((error) => {
        logger.warn(`[dsh-cow] 处理 ${from} 的 answer 失败：${error?.message ?? error}`);
      });
      return;
    }
    if (type === 'msg.complete' || type === 'msg.ask' || type === 'msg.ask.cancel') {
      router.handle(from, event, peerId);
      return;
    }
    if (type.startsWith('file.')) {
      files.handle(from, event);
      return;
    }
    if (type === 'peer.message') {
      logger.info(`[dsh-cow] 收到 ${from} 的消息：${String(payload?.message ?? '').slice(0, 200)}`);
      activity.add({ kind: 'message', text: `收到 ${from} 的协作消息`, peer: from, from, to: selfName(), status: 'received' });
    }
  };

  const onPeer = ({ label, peerId, displayName, node, direction }) => {
    if (!peerId) return;
    activity.add({
      kind: 'peer',
      text: `${direction === 'in' ? '节点上线' : '已连接上级'}：${label}`,
      peer: label,
      from: direction === 'in' ? label : selfName(),
      to: direction === 'in' ? selfName() : label,
      status: 'connected',
    });
    if (direction === 'in') {
      const existing = peers.list().find((peer) => peer.peerId === peerId);
      const desired = String(displayName ?? '').trim() || `子 DSH-${peerId.slice(-6)}`;
      // 同名不同实例由 PeerRegistry 追加实例后缀；连接按最终 label 归位。
      const { peer } = peers.upsert({
        url: '',
        token: '',
        label: desired,
        peerId,
        uuid: String(node?.uuid ?? existing?.uuid ?? ''),
        relation: 'child',
        capabilitySummary: String(node?.description ?? ''),
      });
      try { channel.rebind(existing?.label || peerId, peer.label); } catch { /* 忽略 */ }
      return;
    }
    const parent = peers.list().find((peer) => peer.peerId === peerId) ?? peers.list().find((peer) => peer.relation === 'parent');
    if (parent) {
      peers.upsert({
        ...parent,
        peerId: peerId || parent.peerId,
        capabilitySummary: String(node?.description ?? parent.capabilitySummary ?? ''),
      });
    }
  };

  channel = new Channel({ ctx, resolveConfig: resolve, peers, instance, authorize, onEvent, onPeer, logger, home });
  files = new FileExchange({ instance, channel, peers, resolveConfig: resolve, logger, activity });

  /** 新会话选 preset：web/desktop 的工具体在 preset 里，不选可能没有 bash。 */
  const selectPreset = async (agent) => {
    const presets = service('agentPresets');
    const presetId = resolve().agentPreset || presets?.defaultId || '';
    if (!presets?.select || !presetId) return;
    await presets.select(agent, presetId);
    logger.info?.(`[dsh-cow] dispatch 子会话使用 agent preset: ${presetId}`);
  };

  const attachWorkspace = async (session, cwd, workspaceName) => {
    const registry = service('workspaceRegistry');
    if (!registry || typeof registry.resolveByPath !== 'function' || !cwd) return;
    try {
      let workspace = await registry.resolveByPath(cwd);
      if (!workspace && typeof registry.create === 'function') {
        workspace = await registry.create(cwd, workspaceName || basename(cwd));
      }
      if (!workspace) return;
      if (workspaceName && workspace.title !== workspaceName && typeof workspace.setTitle === 'function') {
        await workspace.setTitle(workspaceName);
      }
      if (session?.id && !(workspace.sessionIds ?? []).includes(session.id)) {
        await workspace.attachSession(session.id);
      }
    } catch (error) {
      logger.warn?.(`[dsh-cow] 会话挂到工作区失败：${error?.message ?? error}`);
    }
  };

  const finishTurn = async (agent) => {
    const sessions = service('sessions');
    const subagents = service('subagents');
    await sessions?.flush?.(agent.session);
    while (subagents?.waitForChildren ? await subagents.waitForChildren(agent) : false) {
      await agent.whenIdle?.();
    }
  };

  const agentOptions = () => {
    const selection = service('agentDefaultModel')?.currentSelection?.() ?? {};
    const options = {};
    if (selection.provider) options.provider = selection.provider;
    if (selection.model) options.model = selection.model;
    if (selection.reasoningEffort) options.reasoningEffort = selection.reasoningEffort;
    return options;
  };

  bridge = new MessageBridge({
    channel,
    agents: {
      get: (sessionId) => service('agents')?.get?.(sessionId) ?? null,
      create: (options) => service('agents')?.create?.(options),
    },
    logger,
    agentOptions,
    workspacePath: (workspace) => resolveChildCwd({ workspace, roots: normalizeRoots(resolve().allowedRoots) }),
    prepareAgent: async (agent, envelope, cwd) => {
      await selectPreset(agent);
      const titleService = service('sessionTitle');
      const title = String(envelope?.session?.title ?? '').trim();
      if (titleService?.rename && title && agent?.session) {
        try { titleService.rename(agent.session, `[COW] ${title}`); } catch (error) {
          logger.warn?.(`[dsh-cow] 设置子会话标题失败：${error?.message ?? error}`);
        }
      }
      await attachWorkspace(agent?.session, cwd, envelope?.workspace?.name);
    },
    finishTurn,
  });

  router = new MessageRouter({
    channel,
    inject: injectMessage,
    logger,
    selfName,
    parentLabel: () => peers.list().find((peer) => peer.relation === 'parent')?.label ?? '',
    parentId: () => peers.list().find((peer) => peer.relation === 'parent')?.peerId ?? '',
  });

  const ensureParentPeer = () => {
    const url = String(instance.parentUrl ?? '').trim();
    const password = String(instance.parentPassword ?? '');
    if (!url || !password) return null;
    const existing = peers.list().find((peer) => peer.relation === 'parent');
    for (const peer of peers.list()) {
      if (peer.relation === 'parent' && peer.label !== existing?.label) {
        try { peers.remove(peer.label); } catch { /* 忽略 */ }
      }
    }
    const label = existing?.label || instance.parent?.label || '主 DSH';
    peers.upsert({
      url,
      token: password,
      label,
      peerId: existing?.peerId || instance.parent?.peerId || '',
      relation: 'parent',
    });
    instance.role = 'member';
    instance.parent = { ...(instance.parent ?? {}), url, label };
    return label;
  };

  const saveParentAuth = ({ url, password }) => {
    patchIdentity(home, {
      parentUrl: url,
      parentPassword: password,
      role: 'member',
      parent: { ...(instance.parent ?? {}), url, label: instance.parent?.label || '主 DSH' },
    });
    Object.assign(instance, { parentUrl: url, parentPassword: password, role: 'member' });
    const label = ensureParentPeer();
    channel.reconnect?.(label);
  };

  const passwordConfigured = () => Boolean(instance.passwordHash);
  const setPassword = (password) => {
    setJoinPassword(home, password);
    Object.assign(instance, loadIdentity({ home }));
    instance.version = currentPackageVersion();
    if (!instance.uuid) instance.uuid = '';
  };

  const applySettings = async () => {
    const cfg = resolve();
    ensureParentPeer();
    carrier?.restart({ listenHost: cfg.listenHost, listenPort: cfg.listenPort });
    channel.tick?.();
  };

  try { ensureDir(DEFAULT_ALLOWED_ROOT); } catch { /* 默认数据目录创建失败时保留给用户手动处理 */ }

  const doctorFn = createDoctor({
    instance,
    channel,
    peers,
    files,
    activity,
    router,
    home,
    resolveConfig: resolve,
    startedAt: Date.now(),
    logger,
  });
  doctor = doctorFn;

  const disposeApproval = registerApprovalTakeover({
    ctx,
    ask: ({ sessionId, question, options, timeoutSec }) => bridge.ask({ sessionId, question, options, timeoutSec }),
    hasParent: () => peers.list().some((peer) => peer.relation === 'parent' && channel.status(peer.label).state === 'connected'),
    logger,
  });

  const adminHandlers = createAdminHandlers({
    instance,
    resolveConfig: resolve,
    peers,
    channel,
    router,
    bridge,
    doctor,
    activity,
    passwordConfigured,
    setPassword,
    getParentPassword: () => instance.parentPassword ?? '',
    saveParentAuth,
    saveSettings: (patch) => writeSettings(home, patch),
    applySettings,
    getEndpoint: () => carrier?.endpoint() ?? '',
    pluginVersion: currentPackageVersion(),
  });

  // ── 工具 ─────────────────────────────────────────────────────
  registerTools(
    ctx,
    createToolDefinitions({
      instance,
      channel,
      peers,
      files,
      doctor,
      bridge,
      router,
      activity,
      sessionInfoFor: (session) => sessionInfo(ctx, session),
    }),
  );

  // ── 系统提示 ─────────────────────────────────────────────────
  const buildGuidance = () => {
    const lines = [];
    lines.push('## dsh-cow 协同工作（WebSocket 长连接）');
    lines.push(`本实例：${instance.displayName || instance.peerId}（${instance.version}）`);
    lines.push(`角色：${instance.role === 'member' ? '子 DSH' : '主 DSH'}`);
    const conns = peers.list().map((peer) => {
      const status = channel.status(peer.label);
      const id = peer.peerId || '(未登记)';
      return `- ${status.state === 'connected' ? '[在线]' : '[离线]'} ${peer.label}（${peer.relation === 'parent' ? '上级' : '下级'}，peerId: ${id}）${status.node?.description ? `：${String(status.node.description).slice(0, 140)}` : ''}`;
    });
    lines.push(...(conns.length ? ['已连接的节点：', ...conns] : ['当前没有已连接的节点。']));
    lines.push('派消息用 cow_send(peerId, message, peerName?)：peerId 是节点稳定标识（cow_…），必须用它；peerName 是可选的显示名提示，名称可能随时变化，不参与路由与校验。消息直接进入对方会话输入队列，立即返回，不等待、不轮询；对方回合结束会把 complete 通知注入你派发时的原会话。子 DSH 用 cow_send(kind="ask") 提问/审批，主 DSH 用 cow_send(replyTo=questionId) 回答，回答会回到同一子会话。文件交换用 cow_send_file / cow_receive_file / cow_pull_dir（只限直接下级，参数同样用 peerId）；文件策略用 cow_set_file_policy 调整。');
    return lines.join('\n');
  };

  ctx.inject(['systemPrompt'], (sctx) => {
    try {
      const systemPrompt = sctx.get('systemPrompt', false);
      if (!systemPrompt?.section) return;
      sctx.effect(() => systemPrompt.section({ name: 'plugin:dsh-cow', order: 300, text: () => buildGuidance() }), 'dsh-cow: prompt');
    } catch (error) {
      logger.warn(`系统提示注册失败：${error?.message ?? error}`);
    }
  });

  // ── 设置页 API ───────────────────────────────────────────────
  ctx.inject(['webServer'], (sctx) => {
    try {
      const webServer = sctx.get('webServer', false);
      if (!webServer?.register) return;
      sctx.effect(() => {
        const disposers = Object.entries(adminHandlers).map(([path, handler]) =>
          webServer.register({ kind: 'exact', path, handler }),
        );
        return () => {
          for (const dispose of disposers) {
            try { dispose(); } catch { /* 忽略 */ }
          }
        };
      }, 'dsh-cow: admin routes');
    } catch (error) {
      logger.warn(`设置页接口注册失败：${error?.message ?? error}`);
    }
  });

  // ── 设置表单 ─────────────────────────────────────────────────
  ctx.inject(['settings'], (sctx) => {
    try {
      const settings = sctx.get('settings', false);
      if (settings?.configure) sctx.effect(() => settings.configure({ auto: true }, ctx.fiber), 'dsh-cow: settings form');
      sctx.effect(
        () => sctx.on('settings/document-updated', (namespace) => {
          if (String(namespace) === SETTINGS_NAMESPACE) void applySettings();
        }),
        'dsh-cow: settings subscription',
      );
    } catch (error) {
      logger.warn(`设置服务不可用：${error?.message ?? error}`);
    }
  });

  // ── 生命周期 ─────────────────────────────────────────────────
  ctx.effect(
    () => {
      const boot = async () => {
        const cfg = resolve();
        ensureParentPeer();
        channel.start();
        const tokenFile = join(coDshDir(home), 'http.token');
        let httpToken = '';
        try {
          if (existsSync(tokenFile)) httpToken = readFileSync(tokenFile, 'utf8').trim();
        } catch { /* 忽略 */ }
        if (!httpToken) {
          httpToken = randomBytes(24).toString('hex');
          writeFileSync(tokenFile, `${httpToken}\n`, { mode: 0o600 });
          try { chmodSync(tokenFile, 0o600); } catch { /* 忽略 */ }
        }
        const api = {
          token: httpToken,
          status: async () => ({
            peerId: instance.peerId,
            displayName: instance.displayName,
            version: instance.version,
            connections: channel.connectedCount(),
            peers: peers.list().map((peer) => ({ label: peer.label, relation: peer.relation, state: channel.status(peer.label).state })),
            files: files.stats(),
          }),
          sendFile: (body) => files.sendFile({ peer: resolveApiPeer(body), localPath: String(body?.path ?? ''), remotePath: String(body?.remotePath ?? '') }),
          receiveFile: (body) => files.requestFile({ peer: resolveApiPeer(body), remotePath: String(body?.path ?? ''), localPath: String(body?.localPath ?? '') || undefined }),
        };
        try {
          const urls = cfg.listenPort > 0 ? [`http://127.0.0.1:${cfg.listenPort}`] : [];
          writeFileSync(join(coDshDir(home), 'http.json'), `${JSON.stringify({ urls, updatedAt: new Date().toISOString() }, null, 2)}\n`, { mode: 0o600 });
        } catch { /* 忽略 */ }
        const handler = createHandler({ channel, info: instance, api });
        carrier = mountCarrier({
          ctx,
          handler,
          upgrade: { path: `${ROUTE_PREFIX}/channel`, handler: (req, socket, head) => channel.handleUpgrade(req, socket, head) },
          config: { listenHost: cfg.listenHost, listenPort: cfg.listenPort },
          logger,
        });
        logger.info(
          `[dsh-cow] 已启动 ${instance.displayName || instance.peerId} v${instance.version}；` +
            `监听 ${cfg.listenHost}:${cfg.listenPort}；已连接 ${channel.connectedCount()}；` +
            `allowedRoots ${normalizeRoots(cfg.allowedRoots).length} 项`,
        );
      };
      void boot().catch((error) => logger.error(`[dsh-cow] 启动失败：${error?.message ?? error}`));
      return () => {
        disposeApproval?.();
        channel.stop();
        carrier?.dispose();
        carrier = null;
        bridge?.dispose();
        router?.dispose();
      };
    },
    'dsh-cow: lifecycle',
  );

}
