/**
 * dsh-cow（co-work）——多台 DSH 通过一条 WebSocket 长连接协同工作。
 *
 *  - 主 DSH：监听端口，接受子 DSH 的 WebSocket 连接；下发任务、观察结果。
 *  - 子 DSH：输入主 DSH 地址 + 共用密码，主动建立长连接；执行任务并回传结果。
 *  - 所有业务帧都是 JSON：hello / welcome / task.assign / task.progress /
 *    task.result / task.cancel / peer.message / ping / pong。
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig, Config, SETTINGS_NAMESPACE, DEFAULT_ALLOWED_ROOT } from './config.js';
import { coDshDir, ensureDir, resolveHomeDir } from './store.js';
import { loadIdentity, patchIdentity, verifyJoinPassword, setJoinPassword } from './identity.js';
import { PeerRegistry, peersPath } from './peers.js';
import { Channel } from './channel.js';
import { CowTasks } from './cow-tasks.js';
import { TaskManager } from './tasks.js';
import { createAdminHandlers } from './admin-api.js';
import { createHandler, mountCarrier } from './server.js';
import { readSettings, writeSettings } from './settings-store.js';
import { createToolDefinitions, registerTools } from './tools.js';
import { createDoctor } from './doctor.js';
import { createUpgradeService } from './upgrade.js';
import { registerApprovalTakeover } from './approval-takeover.js';
import { ActivityLog } from './activity.js';
import { FileExchange } from './files.js';
import { normalizeRoots } from './paths.js';
import { buildMachineDescription } from './machine-profile.js';
import { validateCreateTask, PROTOCOL_VERSION, ROUTE_PREFIX } from './protocol.js';

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
export { TaskManager } from './tasks.js';
export { CowTasks } from './cow-tasks.js';
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
  const startedAt = Date.now();

  let instance;
  try {
    instance = loadIdentity({ home, displayName: resolve().displayName });
  } catch (error) {
    logger.warn(`无法写入实例身份（${home}）：${error?.message ?? error}`);
    instance = { instanceId: `cow_mem_${Math.random().toString(16).slice(2, 10)}`, displayName: '', role: 'leader', parent: null, createdAt: new Date().toISOString() };
  }
  instance.version = currentPackageVersion();
  if (!instance.uuid) instance.uuid = '';
  // 节点名称以配置为准（留空时 resolve 会给计算机名），保证 hello 上报的是当前名称。
  const configuredName = resolve().displayName;
  if (configuredName) instance.displayName = configuredName;

  const describe = () => {
    const cfg = resolve();
    const base = buildMachineDescription({ capabilities: [] });
    return [base, cfg.capabilityNote].filter(Boolean).join('\n').trim();
  };
  Object.defineProperty(instance, 'description', { get: describe, configurable: true });

  const peers = new PeerRegistry({ file: peersPath(home), logger });
  // 清理历史遗留的「自己连自己」记录。
  for (const peer of peers.list()) {
    if ((peer.instanceId && peer.instanceId === instance.instanceId) || (peer.uuid && peer.uuid === instance.uuid)) {
      try { peers.remove(peer.label); } catch { /* 忽略 */ }
    }
  }
  const inboundFrom = new Map(); // localTaskId -> 对端 peer
  const offeredTasks = new Set();
  const pendingClaims = new Map();
  const manager = new TaskManager({
    ctx,
    resolveConfig: () => ({ ...resolve(), maxConcurrentTasks: 1 }),
    instance,
    logger,
    home,
    emit: (event) => {
      if (event?.type === 'task.started') {
        const localTaskId = String(event.task?.taskId ?? '');
        const remoteTaskId = inboundLocal.get(localTaskId);
        const peer = inboundFrom.get(localTaskId);
        if (remoteTaskId && peer) {
          channel.send(peer, { type: 'task.progress', payload: { taskId: remoteTaskId, status: 'running', text: '开始执行任务' } });
        }
        return;
      }
      if (['task.completed', 'task.failed', 'task.canceled'].includes(event?.type)) {
        activity.add({
          kind: 'inbound',
          text: `本机执行${event.type === 'task.completed' ? '完成' : event.type === 'task.canceled' ? '取消' : '失败'}：${event.task?.title ?? event.task?.taskId ?? ''}`,
          taskId: event.task?.taskId ?? '',
          peer: event.task?.callerLabel ?? '',
          status: event.task?.status ?? '',
        });
      }
      if (event?.type !== 'task.progress' || !event.progress) return;
      const localTaskId = String(event.task?.taskId ?? '');
      const remoteTaskId = inboundLocal.get(localTaskId);
      const peer = inboundFrom.get(localTaskId);
      if (!remoteTaskId || !peer) return;
      channel.send(peer, {
        type: 'task.progress',
        payload: {
          taskId: remoteTaskId,
          seq: event.progress.seq,
          kind: event.progress.phase,
          text: event.progress.message,
          ...(event.progress.tool ? { tool: event.progress.tool } : {}),
        },
      });
    },
  });
  manager.init();
  try { ensureDir(DEFAULT_ALLOWED_ROOT); } catch { /* 默认数据目录创建失败时保留给用户手动处理 */ }
  manager.setAllowedRoots(normalizeRoots(resolve().allowedRoots));

  const authorize = (password) => (verifyJoinPassword(instance, password) ? { kind: 'join', label: '' } : null);

  const activity = new ActivityLog();
  const inbound = new Map(); // remoteTaskId -> localTaskId
  const inboundLocal = new Map(); // localTaskId -> remoteTaskId

  // 兼容旧接口：返回当前正在执行的入站任务快照（队列中不返回）。
  const currentInbound = () => {
    for (const localTaskId of inboundLocal.keys()) {
      const task = manager.get(localTaskId);
      if (!task) continue;
      if (task.status === 'running') return manager.snapshot(localTaskId);
    }
    return null;
  };

  // 本机作为子 DSH 时，正在执行/排队的入站任务（含远端 taskId 与队列位置）。
  const inboundTasks = () => {
    const rows = [];
    for (const [localTaskId, remoteTaskId] of inboundLocal) {
      const task = manager.get(localTaskId);
      if (!task) continue;
      const snapshot = manager.snapshot(localTaskId);
      rows.push({
        ...snapshot,
        taskId: remoteTaskId,
        localTaskId,
        from: inboundFrom.get(localTaskId) ?? '',
        prompt: task.prompt ?? '',
        queuePosition: manager.queuePosition(localTaskId),
      });
    }
    return rows.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  };

  // 远端提问：子端 cow_ask 发 task.question，上级 cow_answer 回 task.answer。
  const pendingQuestions = new Map();
  const askQuestion = ({ taskId, question, options = [], timeoutSec = 300 }) => new Promise((resolve) => {
    const parent = peers.list().find((peer) => peer.relation === 'parent');
    if (!parent) {
      resolve({ ok: false, error: '本机没有可直接提问的上级' });
      return;
    }
    const questionId = `q_${randomBytes(6).toString('base64url')}`;
    const sent = channel.send(parent.label, {
      type: 'task.question',
      payload: { taskId, questionId, question: String(question ?? '').slice(0, 2000), options, timeoutSec },
    });
    if (!sent.delivered) {
      resolve({ ok: false, error: `上级 ${parent.label} 未连接，问题没有送达` });
      return;
    }
    const waitMs = Math.min(300, Math.max(10, Number(timeoutSec) || 300)) * 1000;
    const timer = setTimeout(() => {
      pendingQuestions.delete(questionId);
      resolve({ ok: false, error: `等待上级回答超时（${Math.round(waitMs / 1000)}s）` });
    }, waitMs);
    timer.unref?.();
    pendingQuestions.set(questionId, { resolve, timer, taskId, questionId, at: new Date().toISOString() });
  });
  const resolveQuestionAnswer = (payload) => {
    const questionId = String(payload?.questionId ?? '');
    const pending = pendingQuestions.get(questionId);
    if (!pending) return;
    pendingQuestions.delete(questionId);
    clearTimeout(pending.timer);
    pending.resolve({ ok: true, answer: String(payload?.answer ?? ''), questionId });
  };
  const claimTask = (taskId) => {
    if (!taskId) throw new Error('taskId 不能为空');
    const parent = peers.list().find((peer) => peer.relation === 'parent');
    if (!parent) throw new Error('本机没有可直接认领的上级');
    const sent = channel.send(parent.label, { type: 'task.claim', payload: { taskId } });
    if (!sent.delivered) throw new Error('认领请求未送达主 DSH');
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingClaims.delete(taskId);
        reject(new Error('等待主 DSH 下发任务正文超时'));
      }, 60_000);
      timer.unref?.();
      pendingClaims.set(taskId, { resolve, reject, timer });
      logger.info?.(`[dsh-cow] 已发送任务认领 ${taskId}，等待正文`);
    });
  };

  const taskIdForSession = (sessionId) => {
    if (!sessionId) return '';
    for (const task of manager.tasks.values()) {
      if (task.sessionId !== sessionId) continue;
      const remoteTaskId = inboundLocal.get(task.taskId);
      if (remoteTaskId) return remoteTaskId;
    }
    return '';
  };



  const tasks = new CowTasks({ channel: null, instance, logger, home, activity, queueTtlMs: resolve().queueTtlMinutes * 60_000, retentionDays: resolve().taskRetentionDays, autoContinueOnReconnect: resolve().autoContinueOnReconnect, askConcurrency: resolve().askConcurrency, askFullTakeover: resolve().askFullTakeover });
  const injectAsk = (sessionId, text) => {
    const agents = ctx.get?.('agents', false);
    const agent = agents?.get?.(sessionId);
    if (!agent || typeof agent.followup !== 'function') return false;
    agent.followup({
      id: randomBytes(8).toString('hex'),
      role: 'user',
      content: [{ type: 'text', text }],
      source: { kind: 'cow-ask' },
    });
    return true;
  };
  tasks.setAskPolicy({ concurrency: resolve().askConcurrency, fullTakeover: resolve().askFullTakeover });
  tasks.setAskInjector(injectAsk);

  const handleInboundTask = async (payload, from) => {
    const remoteTaskId = String(payload?.taskId ?? '');
    if (!remoteTaskId) return;
    // at-least-once 重发：同一个远端 taskId 已经在跑/排队时不重复建任务。
    if (inbound.has(remoteTaskId)) {
      channel.send(from, { type: 'task.progress', payload: { taskId: remoteTaskId, text: '任务已在本机排队或执行中，忽略重复下发' } });
      return;
    }
    const promptText = payload?.claimTool
      ? `[dsh-cow] 本任务已通过 ${payload.claimTool} 认领（任务 ID ${String(payload?.taskId ?? '')}）。不要再用其他插件的任务工具。\n\n${String(payload?.prompt ?? '')}`
      : payload?.prompt;
    const validated = validateCreateTask({
      taskId: payload?.taskId,
      prompt: promptText,
      title: payload?.title,
      cwd: payload?.cwd,
      timeoutSec: payload?.timeoutSec,
      caller: payload?.caller,
      workspaceName: payload?.workspaceName,
    });
    if (!validated.ok) {
      channel.send(from, { type: 'task.result', payload: { taskId: remoteTaskId, status: 'failed', error: validated.message } });
      return;
    }
    let localTaskId = '';
    try {
      const snapshot = manager.create(validated.value, { callerLabel: payload?.callerLabel || from });
      localTaskId = snapshot.taskId;
      inbound.set(remoteTaskId, snapshot.taskId);
      inboundLocal.set(snapshot.taskId, remoteTaskId);
      inboundFrom.set(snapshot.taskId, from);
      const queued = snapshot.status === 'queued';
      channel.send(from, {
        type: 'task.progress',
        payload: {
          taskId: remoteTaskId,
          status: snapshot.status,
          position: queued ? manager.queuePosition(snapshot.taskId) : 0,
          text: queued ? '已进入本机任务队列，等待前面的任务完成' : '已接受任务，开始执行',
        },
      });
      const done = await manager.waitTerminal(snapshot.taskId);
      logger.info?.(`[dsh-cow] 本地任务 ${snapshot.taskId} 结束：${done.status} / ${JSON.stringify(done.error)}`);
      channel.send(from, {
        type: 'task.result',
        payload: {
          taskId: remoteTaskId,
          status: done.status,
          summary: done.summary ?? '',
          error: done.error ? (done.error.message ?? String(done.error)) : null,
          artifacts: done.artifacts ?? [],
        },
      });
    } catch (error) {
      const message = error?.message ?? error?.code ?? JSON.stringify(error);
      channel.send(from, { type: 'task.result', payload: { taskId: remoteTaskId, status: 'failed', error: String(message) } });
    } finally {
      inbound.delete(remoteTaskId);
      if (localTaskId) {
        inboundLocal.delete(localTaskId);
        inboundFrom.delete(localTaskId);
      }
    }
  };

  const handleInboundContinue = (payload, from) => {
    const remoteTaskId = String(payload?.taskId ?? '');
    if (!remoteTaskId) return;
    const localTaskId = inbound.get(remoteTaskId) || (manager.get(remoteTaskId) ? remoteTaskId : '');
    if (!localTaskId) {
      channel.send(from, { type: 'task.result', payload: { taskId: remoteTaskId, status: 'failed', error: '子端没有找到这个任务，无法继续' } });
      return;
    }
    try {
      manager.continueTask(localTaskId, String(payload?.message ?? '继续完成当前任务。'));
      channel.send(from, { type: 'task.progress', payload: { taskId: remoteTaskId, status: 'running', text: '已收到继续指令，正在继续执行' } });
    } catch (error) {
      channel.send(from, { type: 'task.progress', payload: { taskId: remoteTaskId, status: 'running', text: `继续指令未生效：${error?.message ?? error}` } });
    }
  };

  const onEvent = ({ from, event }) => {
    const type = String(event?.type ?? '');
    const payload = event?.payload ?? {};
    if (type === 'task.offer') {
      const taskId = String(payload?.taskId ?? '');
      logger.info?.(`[dsh-cow] 收到任务邀请 ${taskId}，创建认领会话`);
      if (!taskId) return;
      offeredTasks.add(taskId);
      try {
        const local = manager.create({
          taskId,
          prompt: `这是一条 dsh-cow 任务邀请，任务 ID：${taskId}。请先调用 cow_claim 工具认领该任务，然后开始执行。`,
          title: String(payload?.title ?? '').trim() || `认领任务 ${taskId}`,
          cwd: '',
          timeoutSec: 3600,
          rawPrompt: true,
        }, { callerLabel: from });
        void manager.waitTerminal(local.taskId).then((done) => {
          channel.send(from, {
            type: 'task.result',
            payload: {
              taskId,
              status: done.status,
              summary: done.summary ?? '',
              error: done.error ? (done.error.message ?? String(done.error)) : null,
              artifacts: done.artifacts ?? [],
            },
          });
        }).catch((error) => {
          channel.send(from, { type: 'task.result', payload: { taskId, status: 'failed', error: String(error?.message ?? error) } });
        });
      } catch (error) {
        logger.warn?.(`[dsh-cow] 创建认领会话失败：${error?.message ?? error}`);
      }
      return;
    }
    if (type === 'task.claim.abort') {
      const taskId = String(payload?.taskId ?? '');
      const pending = pendingClaims.get(taskId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingClaims.delete(taskId);
        pending.reject(new Error(String(payload?.reason ?? '认领被拒绝')));
      }
      offeredTasks.delete(taskId);
      logger.info?.(`[dsh-cow] 任务认领被拒绝：${taskId} ${String(payload?.reason ?? '')}`);
      return;
    }
    if (type === 'task.body') {
      const taskId = String(payload?.taskId ?? '');
      logger.info?.(`[dsh-cow] 收到任务正文 ${taskId}，交给 cow_claim`);
      const pending = pendingClaims.get(taskId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingClaims.delete(taskId);
        pending.resolve({
          ok: true,
          taskId,
          prompt: String(payload?.prompt ?? ''),
          cwd: String(payload?.cwd ?? ''),
          title: String(payload?.title ?? ''),
          timeoutSec: Number(payload?.timeoutSec) || 3600,
        });
      }
      offeredTasks.delete(taskId);
      return;
    }
    if (type === 'task.assign') {
      void handleInboundTask(payload, from);
      return;
    }
    if (type === 'task.continue') {
      handleInboundContinue(payload, from);
      return;
    }
    if (type === 'task.cancel') {
      const local = inbound.get(String(payload?.taskId ?? ''));
      if (local) manager.cancel(local, String(payload?.reason ?? '对端取消'));
      return;
    }
    if (type === 'task.answer') {
      resolveQuestionAnswer(payload);
      return;
    }
    if (type === 'task.claim' || type === 'task.progress' || type === 'task.result' || type === 'task.question') {
      tasks.onEvent({ from, event: type, payload });
      return;
    }
    if (type.startsWith('file.')) {
      files.handle(from, event);
      return;
    }
    if (type === 'peer.message') {
      logger.info?.(`[dsh-cow] 收到 ${from} 的消息：${String(payload?.message ?? '').slice(0, 200)}`);
    }
  };

  const onPeer = ({ label, instanceId, displayName, node, direction }) => {
    if (!instanceId) return;
    activity.add({
      kind: 'peer',
      text: `${direction === 'in' ? '节点上线' : '已连接上级'}：${displayName || label}`,
      peer: label,
      status: 'connected',
    });
    if (direction === 'in') {
      const existing = peers.list().find((peer) => peer.instanceId === instanceId);
      const peerLabel = String(displayName ?? '').trim() || `子 DSH-${instanceId.slice(-6)}`;
      peers.upsert({
        url: '',
        token: '',
        label: peerLabel,
        instanceId,
        uuid: String(node?.uuid ?? existing?.uuid ?? ''),
        relation: 'child',
        capabilitySummary: String(node?.description ?? ''),
      });
      // hello 到达时 peers 里可能还没有记录，入站连接先挂在 instanceId 上；
      // 这里把它归位到 peer.label，保证 UI/工具按名字能查到连接状态。
      try { channel.rebind(existing?.label || instanceId, peerLabel); } catch { /* 忽略 */ }
      tasks.reconcileUpgrade(peerLabel, node?.version);
      tasks.flushQueue(peerLabel);
      return;
    }
    const parent = peers.list().find((peer) => peer.instanceId === instanceId) ?? peers.list().find((peer) => peer.relation === 'parent');
    if (parent) {
      peers.upsert({
        ...parent,
        instanceId: instanceId || parent.instanceId,
        capabilitySummary: String(node?.description ?? parent.capabilitySummary ?? ''),
      });
      tasks.flushQueue(parent.label);
    }
  };

  const channel = new Channel({
    ctx,
    resolveConfig: resolve,
    peers,
    instance,
    authorize,
    onEvent,
    onPeer,
    logger,
    home,
  });
  tasks.channel = channel;
  channel.onOffline = (label) => { tasks.peerOffline(label); };
  const files = new FileExchange({ instance, channel, peers, resolveConfig: resolve, logger, activity });
  const upgrade = createUpgradeService({
    root: fileURLToPath(new URL('..', import.meta.url)),
    pkg: { ...PACKAGE, version: currentPackageVersion() },
    files,
    tasks,
    peers,
    channel,
    home,
    logger,
    timeoutMs: resolve().maxTaskMinutes * 60_000,
  });
  const disposeApproval = registerApprovalTakeover({
    ctx,
    askQuestion,
    taskIdForSession,
    hasParent: () => peers.list().some((peer) => peer.relation === 'parent' && channel.status(peer.label).state === 'connected'),
    logger,
  });
  tasks.files = files;
  const doctor = createDoctor({ instance, channel, peers, tasks, manager, files, home, resolveConfig: resolve, startedAt: Date.now(), logger });

  /** 确保「上级」peer 存在，让通道主动拨号。 */
  const ensureParentPeer = () => {
    const url = String(instance.parentUrl ?? '').trim();
    const password = String(instance.parentPassword ?? '');
    if (!url || !password) return null;
    const existing = peers.list().find((peer) => peer.relation === 'parent');
    // 一个节点只能有一个上级：切换上级时清掉旧记录（避免并存的父节点）。
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
      instanceId: existing?.instanceId || instance.parent?.instanceId || '',
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
  // 节点名称以配置为准（留空时 resolve 会给计算机名），保证 hello 上报的是当前名称。
  const configuredName = resolve().displayName;
  if (configuredName) instance.displayName = configuredName;
  };

  let carrier = null;
  const applySettings = async () => {
    const cfg = resolve();
    manager.setAllowedRoots(normalizeRoots(cfg.allowedRoots));
    ensureParentPeer();
    carrier?.restart({ listenHost: cfg.listenHost, listenPort: cfg.listenPort });
    channel.tick?.();
    tasks.queueTtlMs = Math.max(60_000, cfg.queueTtlMinutes * 60_000);
    tasks.retentionDays = cfg.taskRetentionDays;
    tasks.autoContinueOnReconnect = cfg.autoContinueOnReconnect;
    tasks.setAskPolicy({ concurrency: cfg.askConcurrency, fullTakeover: cfg.askFullTakeover });
    tasks.setAskInjector(injectAsk);
    tasks.prune?.();
    upgrade?.setTimeoutMs?.(cfg.maxTaskMinutes * 60_000);
  };

  const adminHandlers = createAdminHandlers({
    instance,
    resolveConfig: resolve,
    peers,
    channel,
    tasks,
    currentInbound,
    inboundTasks,
    doctor,
    upgrade,
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
      tasks,
      currentInbound,
      files,
      upgrade,
      askQuestion,
      taskIdForSession,
      claimTask,
      doctor,
      taskTimeoutSec: resolve().maxTaskMinutes * 60,
      workspaceTitleForSession: (sessionId) => {
        if (!sessionId) return '';
        try {
          const registry = ctx.get?.('workspaceRegistry', false);
          const workspace = registry?.list?.().find((item) => item.sessionIds?.includes(sessionId));
          return workspace?.title ?? '';
        } catch {
          return '';
        }
      },
    }),
  );

  // ── 系统提示 ─────────────────────────────────────────────────
  const buildGuidance = () => {
    const lines = [];
    lines.push('## dsh-cow 协同工作（WebSocket 长连接）');
    lines.push(`本实例：${instance.displayName || instance.instanceId}（${instance.version}）`);
    lines.push(`角色：${instance.role === 'member' ? '子 DSH' : '主 DSH'}`);
    const conns = peers.list().map((peer) => {
      const status = channel.status(peer.label);
      return `- ${status.state === 'connected' ? '[在线]' : '[离线]'} ${peer.label}（${peer.relation === 'parent' ? '上级' : '下级'}）${status.node?.description ? `：${String(status.node.description).slice(0, 160)}` : ''}`;
    });
    lines.push(...(conns.length ? ['已连接的节点：', ...conns] : ['当前没有已连接的节点。']));
    lines.push('派任务用 cow_delegate（写清 peer、prompt、cwd），只能发给**直接下级**，不会继续转发；用 cow_task 观察结果，cow_cancel 取消，cow_notify 发消息。文件交换用 cow_send_file / cow_receive_file（同样只限直接下级，落在对方 allowedRoots 内，sha256 校验，支持断点续传与 cow_cancel_file 取消）；任务失败/中断可用 cow_retry 重试；文件策略用 cow_set_file_policy 调整。');
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
            instanceId: instance.instanceId,
            displayName: instance.displayName,
            version: instance.version,
            connections: channel.connectedCount(),
            peers: peers.list().map((peer) => ({ label: peer.label, relation: peer.relation, state: channel.status(peer.label).state })),
            files: files.stats(),
          }),
          sendFile: (body) => files.sendFile({ peer: String(body?.peer ?? ''), localPath: String(body?.path ?? ''), remotePath: String(body?.remotePath ?? '') }),
          receiveFile: (body) => files.requestFile({ peer: String(body?.peer ?? ''), remotePath: String(body?.path ?? ''), localPath: String(body?.localPath ?? '') || undefined }),
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
          `[dsh-cow] 已启动 ${instance.displayName || instance.instanceId} v${instance.version}；` +
            `监听 ${cfg.listenHost}:${cfg.listenPort}；已连接 ${channel.connectedCount()}；` +
            `allowedRoots ${manager.roots().length} 项`,
        );
      };
      void boot().catch((error) => logger.error(`[dsh-cow] 启动失败：${error?.message ?? error}`));
      return () => {
        disposeApproval?.();
        channel.stop();
        carrier?.dispose();
        carrier = null;
        void manager.dispose();
      };
    },
    'dsh-cow: lifecycle',
  );

  void startedAt;
}
