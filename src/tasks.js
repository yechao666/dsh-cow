/**
 * 入站任务管理器：把「远端派来的任务」变成一次真实的 DSH 会话。
 *
 * 关键取舍：
 *   - 每个远端任务在**本机**新建一个独立 Session（`agents.create`），
 *     因此任务会出现在本机的会话历史里，本机的人能看见、能审计；
 *   - 任务用本机默认 provider/model 与沙箱策略执行，远端不指定模型；
 *   - 多轮续聊复用同一个 Agent（进程重启后用 `agents.resume` 恢复）；
 *   - 任务记录落盘（`$DSH_HOME/cow/tasks/<id>.json`），进程重启时
 *     把「运行中」标记为 interrupted，而不是让调用方无限等。
 */
import { createHash, randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { ensureDir, tasksDir, writeJsonAtomic } from './store.js';
import { resolveWorkspace } from './paths.js';
import { ProtocolError } from './protocol.js';
import { buildDelegatedPrompt, parseNeedsInput } from './prompt.js';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);
const MAX_PROGRESS = 200;

function newTaskId() {
  return `task_${randomBytes(9).toString('base64url')}`;
}

function messageObject(text) {
  return {
    id: randomBytes(8).toString('hex'),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  };
}

/** 从 Session 持久事件里提取本轮最后的助手文本；错误抛出。 */
export function summarizeSession(session, firstSeq) {
  let started = false;
  let text = '';
  let error = null;
  for (let seq = firstSeq; seq < session.seq; seq += 1) {
    const event = session.eventAt(seq);
    if (!event) continue;
    if (event.type === 'turn/start') {
      started = true;
      continue;
    }
    if (!started) continue;
    if (event.type === 'assistant/message') {
      const content = event.data?.message?.content ?? [];
      const joined = Array.isArray(content)
        ? content
            .filter((block) => block?.type === 'text')
            .map((block) => String(block.text ?? ''))
            .join('')
        : '';
      if (joined.trim()) text = joined;
    }
    if (event.type === 'turn/end') {
      const reason = event.data?.reason;
      if (reason?.kind === 'error') error = reason.error ?? new Error('Agent 执行失败');
    }
  }
  if (error) {
    const message = error instanceof Error
      ? error.message
      : (error?.message ? String(error.message) : (() => { try { return JSON.stringify(error); } catch { return String(error); } })());
    throw new Error(message);
  }
  return text.trim();
}

export class TaskManager {
  constructor({ ctx, resolveConfig, instance, logger, home, now, emit }) {
    this.ctx = ctx;
    this.emitEvent = emit ?? null;
    this.resolveConfig = resolveConfig;
    this.instance = instance;
    this.logger = logger ?? console;
    this.now = now ?? (() => Date.now());
    this.home = home;
    this.dir = tasksDir(home);
    this.tasks = new Map();
    this.waiters = new Map();
    this.queue = [];
    this.active = 0;
    this.startedAt = Date.now();
    this.workspaceQueue = Promise.resolve();
  }

  init() {
    ensureDir(this.dir);
    this.#restore();
    this.prune();
    // 历史任务会话也补挂到对应工作区；workspace 服务可能晚于插件挂载，重试几次。
    for (const delay of [500, 2500, 8000]) {
      const timer = setTimeout(() => { void this.#backfillWorkspaces(); }, delay);
      timer.unref?.();
    }
    return this;
  }

  async #backfillWorkspaces() {
    for (const task of this.tasks.values()) {
      if (task.sessionId && task.cwd) {
        await this.#attachWorkspace(task.sessionId, task.cwd, task.workspaceName, { createIfMissing: false });
      }
    }
  }

  // ── 持久化 ────────────────────────────────────────────────────

  #file(taskId) {
    return join(this.dir, `${taskId}.json`);
  }

  #persist(task) {
    const record = { ...this.#snapshot(task, { after: 0, internal: true }), prompt: task.prompt, context: task.context, workspaceName: task.workspaceName ?? '' };
    try {
      writeJsonAtomic(this.#file(task.taskId), record);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 任务落盘失败 ${task.taskId}: ${error?.message ?? error}`);
    }
  }

  #restore() {
    let files = [];
    try {
      files = readdirSync(this.dir).filter((name) => name.endsWith('.json'));
    } catch {
      return;
    }
    for (const name of files) {
      let record;
      try {
        record = JSON.parse(readFileSync(join(this.dir, name), 'utf8'));
      } catch {
        continue;
      }
      if (!record?.taskId) continue;
      const task = {
        ...record,
        agent: null,
        progress: Array.isArray(record.progress) ? record.progress : [],
        progressSeq: Number(record.progressSeq ?? record.progress?.length ?? 0),
        lastSeq: record.lastSeq ?? null,
        turns: Number(record.turns ?? 0),
      };
      if (!TERMINAL.has(task.status)) {
        task.status = 'failed';
        task.finishedAt = new Date().toISOString();
        task.error = { code: 'interrupted', message: 'DSH 进程重启，任务被中断；请重新提交' };
        this.#persist(task);
      }
      this.tasks.set(task.taskId, task);
    }
  }

  prune() {
    const cfg = this.resolveConfig();
    const cutoff = Date.now() - (cfg.taskRetentionDays ?? 3) * 86_400_000;
    for (const [taskId, task] of this.tasks) {
      if (!TERMINAL.has(task.status)) continue;
      const at = Date.parse(task.finishedAt ?? task.createdAt ?? 0);
      if (Number.isFinite(at) && at < cutoff) {
        this.tasks.delete(taskId);
        try {
          unlinkSync(this.#file(taskId));
        } catch {
          /* 忽略 */
        }
      }
    }
  }

  // ── 对外操作 ──────────────────────────────────────────────────

  get(taskId) {
    return this.tasks.get(String(taskId ?? '')) ?? null;
  }

  /**
   * 某个会话收到的委派链（不含本实例）。工具会再把本实例追加进去，
   * 所以这里不能重复加自己；不在委派会话里时返回 []。
   */
  list() {
    return [...this.tasks.values()]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 50)
      .map((task) => this.#snapshot(task, { after: 0, internal: false }));
  }

  /**
   * 创建一个远端任务。校验工作目录白名单与并发上限后立即返回（真正执行在后台）。
   * @param {{value: object}} validated validateCreateTask 的返回值
   * @param {{callerLabel?: string}} meta
   */
  create(validated, meta = {}) {
    const cfg = this.resolveConfig();
    if (!cfg.enabled) throw new ProtocolError('unavailable', 'dsh-cow 已禁用');

    // 父端重连后可能用同一 taskId 重发；已存在时直接复用，保证幂等。
    const existingId = String(validated.taskId ?? '');
    if (existingId) {
      const existing = this.get(existingId);
      if (existing) return this.#snapshot(existing, { after: 0 });
    }

    const workspace = resolveWorkspace(validated.cwd, this.roots());
    if (!workspace.ok) {
      throw new ProtocolError(
        workspace.reason === 'no_roots' ? 'forbidden' : 'invalid_request',
        workspace.reason === 'no_roots'
          ? '本实例没有配置 allowedRoots，拒绝所有远端任务'
          : `工作目录不在 allowedRoots 内：${validated.cwd || '(默认)'}`,
        { reason: workspace.reason },
      );
    }
    if (this.active >= cfg.maxConcurrentTasks + cfg.maxQueuedTasks) {
      throw new ProtocolError('too_many_tasks', `远端任务已满（运行 ${this.active}，上限 ${cfg.maxConcurrentTasks + cfg.maxQueuedTasks}）`);
    }

    const taskId = existingId || newTaskId();
    const task = {
      taskId,
      title: validated.title || validated.prompt.slice(0, 60).replace(/\s+/g, ' '),
      prompt: validated.prompt,
      rawPrompt: validated.rawPrompt === true,
      context: validated.context,
      cwd: workspace.path,
      caller: validated.caller,
      callerLabel: meta.callerLabel ?? '',
      workspaceName: String(validated.workspaceName ?? ''),
      status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      sessionId: validated.sessionId ?? null,
      summary: '',
      error: null,
      needsInput: null,
      toolCalls: 0,
      turns: 0,
      lastSeq: null,
      progressSeq: 0,
      progress: [],
      timeoutSec: Math.min(validated.timeoutSec ?? cfg.maxTaskMinutes * 60, cfg.maxTaskMinutes * 60),
      agent: null,
      cancelReason: null,
      disposers: [],
    };
    this.tasks.set(taskId, task);
    this.#persist(task);
    this.queue.push(task);
    this.#pump();
    return this.#snapshot(task, { after: 0 });
  }

  /**
   * 续聊：给同一个远端任务再发一条消息（复用 Agent，必要时 resume 会话）。
   *
   * 提交后立即返回，调用方用 `wait()` 长轮询拿结果 —— 续聊的一轮也可能跑很久，
   * 不能让 HTTP 请求一直挂着。
   */
  startMessage(taskId, validated) {
    const task = this.get(taskId);
    if (!task) throw new ProtocolError('not_found', `任务不存在：${taskId}`);
    if (!TERMINAL.has(task.status)) throw new ProtocolError('conflict', '任务仍在排队或执行中');
    const cfg = this.resolveConfig();
    task.status = 'running';
    task.startedAt = task.startedAt ?? new Date().toISOString();
    task.finishedAt = null;
    task.error = null;
    task.cancelReason = null;
    task.turns += 1;
    this.#record(task, { phase: 'user', message: validated.message.slice(0, 280) });
    this.#persist(task);
    this.#notify(task);

    const timeoutMs = Math.min((validated.timeoutSec ?? cfg.maxTaskMinutes * 60) * 1000, cfg.maxTaskMinutes * 60_000);
    this.active += 1;
    void (async () => {
      try {
        await this.#runTurn(task, { text: validated.message, timeoutMs });
        await this.#complete(task);
      } catch (error) {
        this.#fail(task, error);
      } finally {
        this.active = Math.max(0, this.active - 1);
        this.#pump();
      }
    })();
    return this.#snapshot(task, { after: 0 });
  }

  /**
   * 父端在子端重连后发来「继续」指令：给仍在执行的任务补充一轮输入。
   * 不改任务 ID，也不新建任务；若任务已结束则直接返回快照。
   */
  continueTask(taskId, text = '继续完成当前任务。') {
    const task = this.get(taskId);
    if (!task) throw new ProtocolError('not_found', `任务不存在：${taskId}`);
    if (TERMINAL.has(task.status)) return this.#snapshot(task, { after: 0 });
    if (!task.agent || typeof task.agent.followup !== 'function') {
      throw new ProtocolError('conflict', '任务还没有可续跑的 Agent，请等待它启动');
    }
    task.turns += 1;
    task.status = 'running';
    task.startedAt = task.startedAt ?? new Date().toISOString();
    task.finishedAt = null;
    task.error = null;
    this.#record(task, { phase: 'user', message: String(text).slice(0, 280) });
    this.#persist(task);
    task.agent.followup(messageObject(String(text)));
    this.#notify(task);
    return this.#snapshot(task, { after: 0 });
  }

  cancel(taskId, reason = '调用方取消') {
    const task = this.get(taskId);
    if (!task) throw new ProtocolError('not_found', `任务不存在：${taskId}`);
    if (TERMINAL.has(task.status)) return this.#snapshot(task, { after: 0 });
    task.cancelReason = reason;
    if (task.status === 'queued') {
      this.queue = this.queue.filter((item) => item.taskId !== task.taskId);
      this.#fail(task, { code: 'canceled', message: reason });
      return this.#snapshot(task, { after: 0 });
    }
    try {
      task.agent?.cancel?.(new Error(reason));
    } catch {
      /* 忽略 */
    }
    return this.#snapshot(task, { after: 0 });
  }

  /** 快照：after 返回增量进度；internal 时附带内部字段。 */
  #snapshot(task, { after = 0, internal = false } = {}) {
    const progress = task.progress.filter((item) => item.seq > Number(after ?? 0));
    const snapshot = {
      protocol: 'cow/v1',
      taskId: task.taskId,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      cwd: task.cwd,
      caller: task.caller,
      callerLabel: task.callerLabel ?? '',
      sessionId: task.sessionId,
      summary: task.summary ?? '',
      error: task.error,
      needsInput: task.needsInput ?? null,
      toolCalls: task.toolCalls ?? 0,
      turns: task.turns ?? 0,
      progress,
      progressSeq: task.progressSeq,
      progressMore: task.progress.length >= MAX_PROGRESS,
      artifacts: task.artifacts ?? [],
    };
    if (internal) snapshot.updatedAt = new Date().toISOString();
    return snapshot;
  }

  snapshot(taskId, { after = 0 } = {}) {
    const task = this.get(taskId);
    if (!task) throw new ProtocolError('not_found', `任务不存在：${taskId}`);
    return this.#snapshot(task, { after });
  }

  /**
   * 长轮询：等待任务进入终态，或超时/取消后立即返回当前快照。
   */
  wait(taskId, timeoutMs, signal) {
    const task = this.get(taskId);
    if (!task) return Promise.reject(new ProtocolError('not_found', `任务不存在：${taskId}`));
    if (TERMINAL.has(task.status) || timeoutMs <= 0) return Promise.resolve(this.#snapshot(task, { after: 0 }));
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener?.('abort', finish);
        this.waiters.get(taskId)?.delete(finish);
        resolve(this.#snapshot(task, { after: 0 }));
      };
      const timer = setTimeout(finish, timeoutMs);
      timer.unref?.();
      signal?.addEventListener?.('abort', finish, { once: true });
      if (!this.waiters.has(taskId)) this.waiters.set(taskId, new Set());
      this.waiters.get(taskId).add(finish);
    });
  }

  /**
   * 等到任务进入终态（排队中也会一直等），供入站处理在后台等待结果。
   */
  /** 排队中的任务前面还有几个（1-based）；不在队列返回 0。 */
  queuePosition(taskId) {
    const index = this.queue.findIndex((task) => task.taskId === taskId);
    return index >= 0 ? index + 1 : 0;
  }

  async waitTerminal(taskId) {
    for (;;) {
      const snapshot = this.snapshot(taskId);
      if (TERMINAL.has(snapshot.status)) return snapshot;
      await this.wait(taskId, 30_000);
    }
  }

  /** 结束所有任务并释放 Agent（插件卸载时调用）。 */
  async dispose() {
    for (const task of this.tasks.values()) {
      clearTimeout(task.releaseTimer);
      for (const dispose of task.disposers ?? []) {
        try {
          dispose();
        } catch {
          /* 忽略 */
        }
      }
      task.disposers = [];
      if (!TERMINAL.has(task.status)) {
        try {
          task.agent?.cancel?.(new Error('dsh-cow 卸载'));
        } catch {
          /* 忽略 */
        }
      }
    }
    this.queue = [];
  }

  // ── 内部执行 ──────────────────────────────────────────────────

  /** 入站工作目录白名单由宿主层注入（设置页 / 装配配置）。 */
  roots() {
    return Array.isArray(this.allowedRoots) ? this.allowedRoots : [];
  }

  setAllowedRoots(roots) {
    this.allowedRoots = Array.isArray(roots) ? roots : [];
  }

  #pump() {
    const cfg = this.resolveConfig();
    while (this.active < cfg.maxConcurrentTasks && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task || task.status !== 'queued') continue;
      this.active += 1;
      void this.#execute(task).finally(() => {
        this.active = Math.max(0, this.active - 1);
        this.#pump();
      });
    }
  }

  async #execute(task) {
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    task.turns += 1;
    if (this.emitEvent) {
      try { this.emitEvent({ type: 'task.started', task: { taskId: task.taskId, status: 'running' } }); } catch { /* 忽略 */ }
    }
    const prompt = task.rawPrompt ? task.prompt : buildDelegatedPrompt({ task, caller: task.caller });
    this.#persist(task);
    this.#notify(task);
    try {
      await this.#runTurn(task, { text: prompt, timeoutMs: task.timeoutSec * 1000 });
      if (task.cancelReason) {
        task.status = 'canceled';
        task.finishedAt = new Date().toISOString();
        task.error = { code: 'canceled', message: task.cancelReason };
        this.#persist(task);
        this.#notify(task);
        this.#emit(task, 'task.canceled');
        return;
      }
      await this.#complete(task);
    } catch (error) {
      this.#fail(task, error);
    }
  }

  async #complete(task) {
    task.artifacts = this.#collectArtifacts(task);
    const summary = task.pendingSummary ?? task.summary ?? '';
    task.summary = summary.slice(0, 32_000);
    task.pendingSummary = '';
    task.needsInput = parseNeedsInput(task.summary);
    if (task.cancelReason) {
      task.status = 'canceled';
      task.error = { code: 'canceled', message: task.cancelReason };
    } else if (!task.summary) {
      task.status = 'failed';
      task.error = { code: 'empty_result', message: 'Agent 没有产生文本输出' };
    } else {
      task.status = 'succeeded';
    }
    task.finishedAt = new Date().toISOString();
    this.#record(task, { phase: 'done', message: task.status });
    this.#persist(task);
    this.#releaseAgent(task);
    this.#notify(task);
    this.#emit(task, task.status === 'succeeded' ? 'task.completed' : task.status === 'canceled' ? 'task.canceled' : 'task.failed');
  }

  #fail(task, error) {
    if (TERMINAL.has(task.status)) return;
    try {
      this.logger.info?.(`[dsh-cow] 任务 ${task.taskId} 失败详情：${(() => { try { return JSON.stringify(error, Object.getOwnPropertyNames(error ?? {})).slice(0, 800); } catch { return String(error); } })()}`);
    } catch { /* 忽略 */ }
    task.status = task.cancelReason ? 'canceled' : 'failed';
    task.finishedAt = new Date().toISOString();
    task.error = {
      code: error?.code ?? 'task_failed',
      message: String(error?.message ?? error).slice(0, 2000),
    };
    this.#record(task, { phase: 'error', message: task.error.message.slice(0, 280) });
    this.#persist(task);
    this.#notify(task);
    this.#emit(task, task.status === 'canceled' ? 'task.canceled' : 'task.failed');
  }

  /**
   * 把任务状态变化抛给宿主层（index.js 会转成通道事件推给发起方）。
   * 只发终态与「需要人工确认」，进度推送留给轮询。
   */
  #emit(task, type) {
    if (!this.emitEvent) return;
    try {
      this.emitEvent({
        type,
        task: {
          taskId: task.taskId,
          title: task.title,
          status: task.status,
          cwd: task.cwd,
          callerLabel: task.callerLabel ?? '',
          caller: task.caller ?? null,
          sessionId: task.sessionId,
          summary: String(task.summary ?? '').slice(0, 4_000),
          needsInput: task.needsInput ?? null,
          error: task.error ?? null,
          toolCalls: task.toolCalls ?? 0,
          turns: task.turns ?? 0,
          artifacts: task.artifacts ?? [],
          finishedAt: task.finishedAt ?? null,
        },
      });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 任务事件回调失败: ${error?.message ?? error}`);
    }
  }

  #notify(task) {
    const waiters = this.waiters.get(task.taskId);
    if (!waiters) return;
    for (const finish of [...waiters]) finish();
  }

  /**
   * 升级类任务以「子端重连后上报的版本」为准完成。
   * plugin_manager 安装会卸载插件，旧会话往往来不及回传成功；只要子端
   * 以目标版本重新上线，就把仍在运行/排队的升级任务标记为成功。
   */
  reconcileUpgrade(peerLabel, version) {
    const target = String(version ?? '');
    if (!target) return 0;
    let changed = 0;
    for (const task of this.tasks.values()) {
      if (!task.upgrade || String(task.peer ?? '') !== String(peerLabel ?? '')) continue;
      if (!['queued', 'running'].includes(task.status)) continue;
      if (!task.upgradeTarget || String(task.upgradeTarget) !== target) continue;
      task.status = 'succeeded';
      task.summary = `子端已重连并上报目标版本 ${target}`;
      task.error = null;
      task.finishedAt = new Date().toISOString();
      this.#record(task, { phase: 'done', message: `子端已上报 ${target}` });
      this.#persist(task);
      this.#releaseAgent(task);
      this.#notify(task);
      this.#emit(task, 'task.completed');
      changed += 1;
    }
    return changed;
  }

  /** 记录进度并推给发起方（由 index.js 转成 task.progress 帧）。 */
  #progress(task, { phase, message, tool, throttleKey = '' }) {
    const now = Date.now();
    if (throttleKey) {
      task.throttle = task.throttle ?? {};
      if (now - (task.throttle[throttleKey] ?? 0) < 800) return;
      task.throttle[throttleKey] = now;
    }
    this.#record(task, { phase, message, tool });
    if (!this.emitEvent) return;
    const item = task.progress[task.progress.length - 1];
    try {
      this.emitEvent({
        type: 'task.progress',
        task: { taskId: task.taskId, status: task.status, caller: task.caller ?? null },
        progress: item,
      });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 进度推送失败: ${error?.message ?? error}`);
    }
  }

  /**
   * 任务期间在 cwd 下新增/修改的文件（最多 50 个，排除 .git/node_modules 等）。
   * 只记录清单；回传由发起方按需拉取。
   */
  #collectArtifacts(task) {
    const root = String(task.cwd ?? '');
    if (!root) return [];
    const since = Date.parse(task.startedAt ?? task.createdAt ?? 0) - 1000;
    const out = [];
    const skip = new Set(['.git', 'node_modules', '.dsh', '.cache', 'dist', 'build']);
    let truncated = false;
    const stack = [root];
    while (stack.length && out.length < 50) {
      const dir = stack.pop();
      let entries = [];
      try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
      for (const entry of entries) {
        if (entry.name.startsWith('.') && entry.name !== '.env') continue;
        if (skip.has(entry.name)) continue;
        const abs = join(dir, entry.name);
        if (entry.isDirectory()) {
          stack.push(abs);
          continue;
        }
        if (!entry.isFile()) continue;
        let stat;
        try { stat = statSync(abs); } catch { continue; }
        if (stat.mtimeMs < since) continue;
        if (out.length >= 50) { truncated = true; break; }
        const rel = relative(root, abs) || entry.name;
        const item = { path: abs, name: rel, bytes: stat.size, modifiedAt: new Date(stat.mtimeMs).toISOString() };
        if (stat.size <= 5 * 1024 * 1024) {
          try { item.sha256 = createHash('sha256').update(readFileSync(abs)).digest('hex'); } catch { /* 忽略 */ }
        }
        out.push(item);
      }
    }
    return out.slice(0, 50).map((item) => ({ ...item, truncated }));
  }

  #record(task, { phase, message, tool }) {
    task.progressSeq += 1;
    task.progress.push({
      seq: task.progressSeq,
      at: new Date().toISOString(),
      phase,
      message: String(message ?? '').slice(0, 280),
      ...(tool ? { tool } : {}),
    });
    if (task.progress.length > MAX_PROGRESS) task.progress = task.progress.slice(-MAX_PROGRESS);
  }

  /**
   * 给新会话选 preset：web / desktop 的工具体在 preset 里，不选就没有 bash。
   * 必须在该会话开始第一轮之前调用（registry 会拒绝已开始的会话）。
   */
  async #selectPreset(agent) {
    const presets = this.ctx.get('agentPresets', false);
    if (!presets?.select) return;
    const presetId = this.resolveConfig().agentPreset || presets.defaultId || '';
    if (!presetId) return;
    try {
      await presets.select(agent, presetId);
      this.logger.info?.(`[dsh-cow] 远端任务会话使用 agent preset: ${presetId}`);
    } catch (error) {
      throw new ProtocolError('unavailable', `无法为远端任务会话选择 agent preset（${presetId}）：${error?.message ?? error}`);
    }
  }

  async #ensureAgent(task) {
    if (task.agent) return task.agent;
    const agents = this.ctx.get('agents', false);
    const sessions = this.ctx.get('sessions', false);
    if (!agents || !sessions) throw new ProtocolError('unavailable', '当前 DSH 没有 agents/sessions 服务，无法执行远端任务');
    const selection = this.ctx.get('agentDefaultModel', false)?.currentSelection?.() ?? {};
    const agentOptions = {};
    if (selection.provider) agentOptions.provider = selection.provider;
    if (selection.model) agentOptions.model = selection.model;
    if (selection.reasoningEffort) agentOptions.reasoningEffort = selection.reasoningEffort;
    if (!agentOptions.provider || !agentOptions.model) {
      throw new ProtocolError('unavailable', '无法确定本机默认模型（agentDefaultModel 不可用）');
    }

    let agent;
    if (task.sessionId) {
      // 会话可能已经在本进程里活着（例如使用者正在 Web UI 里看 / 接着这个会话），
      // 此时直接复用，resume 会因写入句柄被占用而失败。
      const live = agents.get?.(task.sessionId);
      if (live?.session) {
        this.logger.info?.(`[dsh-cow] 复用已存在的远端会话 agent: ${task.sessionId}`);
        task.agent = live;
        this.#attachSessionEvents(task, live);
        return live;
      }
      try {
        const handle = await agents.resume({ resumeSessionId: task.sessionId, agentOptions });
        agent = handle?.agent ?? handle;
      } catch (error) {
        throw new ProtocolError(
          'unavailable',
          `无法恢复远端任务会话 ${task.sessionId}：${error?.message ?? error}。若该会话正被本机界面占用，请先关闭它；否则重新委派一个新任务。`,
        );
      }
    } else {
      task.sessionId = `session-cow-${randomBytes(6).toString('base64url')}`;
      const handle = await agents.create({ sessionId: task.sessionId, meta: { cwd: task.cwd }, agentOptions });
      agent = handle?.agent ?? handle;
      if (agent) await this.#selectPreset(agent);
    }
    if (!agent) throw new ProtocolError('unavailable', 'agents.create 没有返回 Agent');
    task.agent = agent;
    try {
      const titleService = this.ctx.get?.('sessionTitle');
      if (titleService?.rename && agent.session) titleService.rename(agent.session, task.title);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 设置会话标题失败：${error?.message ?? error}`);
    }
    this.#attachSessionEvents(task, agent);
    await this.#attachWorkspace(task.sessionId, task.cwd, task.workspaceName);
    return agent;
  }

  /**
   * 把任务会话挂到工作目录对应的 Workspace 下，让子 DSH 的会话列表按工作区分组，
   * 与主 DSH 的「按工作区」组织方式一致。
   */
  #queueWorkspace(operation) {
    const run = this.workspaceQueue.then(operation, operation);
    this.workspaceQueue = run.catch(() => {});
    return run;
  }

  /**
   * 把任务会话挂到工作目录对应的 Workspace 下，让子 DSH 的会话列表按工作区分组，
   * 与主 DSH 的「按工作区」组织方式一致。
   * 同一路径可能因为并发 resolve/create 产生重复 Workspace，这里串行创建并把
   * 重复项中的会话合并到保留项后删除重复项。
   */
  async #attachWorkspace(sessionId, cwd, workspaceName = '', { createIfMissing = true } = {}) {
    return this.#queueWorkspace(async () => {
      let registry = null;
      try {
        registry = this.ctx?.get?.('workspaceRegistry', false) ?? null;
      } catch {
        registry = null;
      }
      if (!registry || typeof registry.resolveByPath !== 'function') return;
      let workspace;
      let created = false;
      try {
        // 按 allowedRoots 归并，而不是按任务的具体子目录：同一子 DSH 的所有
        // cow 会话应落在同一个工作区，名称与主 DSH 的工作区对齐。
        const candidates = this.roots()
          .filter((root) => cwd === root || cwd.startsWith(`${root.replace(/[\\/]$/, '')}/`))
          .sort((a, b) => b.length - a.length);
        const workspacePath = cwd;
        const root = candidates[0] ?? cwd;
        const workspaceTitle = workspaceName || (cwd === root
          ? basename(root)
          : `${basename(root)} / ${relative(root, cwd)}`);
        workspace = await registry.resolveByPath(workspacePath);
        if (!workspace) {
          // 启动期的历史任务补挂只负责把会话接到已存在的工作区。此时多个 DSH
          // 实例（主进程 + 子 DSH）可能同时对同一份 workspace 存储做 backfill，
          // 各自看到的 entities 会落后于对方刚写入的记录；若在这里 create，
          // 就会为同一路径反复生成空工作区，累积成重复项。故补挂一律不创建。
          if (!createIfMissing) return;
          if (typeof registry.create === 'function') {
            workspace = await registry.create(workspacePath, workspaceTitle);
            created = true;
          }
        }
        if (!workspace) return;

        // 合并同一路径的重复工作区：保留当前项，把其它项的会话迁过来后删除。
        const duplicates = registry.list().filter((item) => item.id !== workspace.id && item.path === workspace.path);
        for (const duplicate of duplicates) {
          for (const duplicateSession of duplicate.sessionIds ?? []) {
            try {
              if (!workspace.sessionIds.includes(duplicateSession)) await workspace.attachSession(duplicateSession);
            } catch (error) {
              this.logger.warn?.(`[dsh-cow] 迁移会话 ${duplicateSession} 到工作区 ${workspace.id} 失败：${error?.message ?? error}`);
            }
          }
          if (typeof registry.delete === 'function') {
            try {
              await registry.delete(duplicate.id);
            } catch (error) {
              this.logger.warn?.(`[dsh-cow] 删除重复工作区 ${duplicate.id} 失败：${error?.message ?? error}`);
            }
          }
        }

        // 主子工作区名称对齐：主 DSH 下达任务时带过来的工作区名优先。
        if (workspace.title !== workspaceTitle && typeof workspace.setTitle === 'function') {
          await workspace.setTitle(workspaceTitle);
        }

        // 清理同名但没有任何会话的空工作区，避免界面出现两个「C」。
        if (typeof registry.delete === 'function') {
          for (const empty of registry.list()) {
            if (empty.id === workspace.id || empty.title !== workspace.title) continue;
            if ((empty.sessionIds?.length ?? 0) > 0) continue;
            try {
              await registry.delete(empty.id);
            } catch (error) {
              this.logger.warn?.(`[dsh-cow] 删除空工作区 ${empty.id} 失败：${error?.message ?? error}`);
            }
          }
        }
        if (!workspace.sessionIds.includes(sessionId)) await workspace.attachSession(sessionId);
      } catch (error) {
        this.logger.warn?.(`[dsh-cow] 会话 ${sessionId} 挂到工作区失败：${error?.message ?? error}`);
        // 本次新建却没挂上任何会话，说明与其它实例的写入撞车了。这种空记录
        // 会在界面上表现为同名的重复工作区，直接回收注册（目录与会话日志保留）。
        if (created && workspace && (workspace.sessionIds?.length ?? 0) === 0 && typeof registry.delete === 'function') {
          try {
            await registry.delete(workspace.id);
          } catch (cleanupError) {
            this.logger.warn?.(`[dsh-cow] 回收空工作区 ${workspace.id} 失败：${cleanupError?.message ?? cleanupError}`);
          }
        }
      }
    });
  }

  #attachSessionEvents(task, agent) {
    const ctx = this.ctx;
    const disposers = [];
    if (typeof ctx.on === 'function') {
      disposers.push(
        ctx.on('session/event', (session, event) => {
          if (session !== agent.session) return;
          if (!event || typeof event.type !== 'string') return;
          if (event.type === 'tool/call') {
            task.toolCalls += 1;
            const name = event.data?.name ?? event.data?.toolName ?? 'tool';
            this.#progress(task, { phase: 'tool', message: `调用工具 ${name}`, tool: String(name), throttleKey: 'tool' });
          } else if (event.type === 'turn/start') {
            this.#progress(task, { phase: 'turn', message: '开始新一轮', throttleKey: 'turn' });
          } else if (event.type === 'assistant/message') {
            const content = event.data?.message?.content ?? [];
            const text = Array.isArray(content)
              ? content
                  .filter((block) => block?.type === 'text')
                  .map((block) => String(block.text ?? ''))
                  .join('')
              : '';
            if (text.trim()) {
              task.pendingSummary = text;
              this.#progress(task, {
                phase: 'text',
                message: text.trim().replace(/\s+/g, ' ').slice(0, 280),
                throttleKey: 'text',
              });
            }
          }
        }),
      );
      disposers.push(
        ctx.on('agent/error', (payload) => {
          if (payload?.agent !== agent) return;
          task.agentError = payload?.error ?? new Error('Agent 执行失败');
        }),
      );
    }
    task.disposers = disposers;
  }

  async #runTurn(task, { text, timeoutMs }) {
    const sessions = this.ctx.get('sessions', false);
    const subagents = this.ctx.get('subagents', false);
    const agent = await this.#ensureAgent(task);
    // 取消可能发生在 Agent 还在创建的过程中：此时 agent.cancel 还没接上，
    // 必须在真正开始这一轮之前补一次检查。
    if (task.cancelReason) return;
    const from = agent.session.seq;
    task.agentError = null;
    task.pendingSummary = '';

    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ProtocolError('timeout', `任务超过 ${Math.round(timeoutMs / 1000)} 秒，已取消`)), timeoutMs);
      timer.unref?.();
    });
    try {
      agent.followup(messageObject(text));
      await Promise.race([agent.whenIdle(), timeout]);
      while (subagents?.waitForChildren ? await subagents.waitForChildren(agent) : false) {
        await agent.whenIdle();
      }
      if (task.cancelReason) return;
      await sessions?.flush?.(agent.session);
      const summary = summarizeSession(agent.session, from);
      task.lastSeq = agent.session.seq;
      if (task.agentError) throw task.agentError;
      task.pendingSummary = summary;
    } catch (error) {
      try {
        agent.cancel?.(error);
      } catch {
        /* 忽略 */
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * 任务结束后延迟释放 Agent：还要给「续聊」留一个窗口，
   * 超过窗口才真正 dispose；下次续聊会走 agents.resume 恢复会话。
   */
  #releaseAgent(task) {
    const agent = task.agent;
    if (!agent) return;
    clearTimeout(task.releaseTimer);
    task.releaseTimer = setTimeout(() => {
      if (task.agent !== agent) return;
      for (const fn of task.disposers ?? []) {
        try {
          fn();
        } catch {
          /* 忽略 */
        }
      }
      task.disposers = [];
      task.agent = null;
      try {
        if (typeof agent.dispose === 'function') agent.dispose();
        else agent.cancel?.(new Error('dsh-cow: 释放空闲 Agent'));
      } catch {
        /* 忽略 */
      }
    }, 10 * 60_000);
    task.releaseTimer.unref?.();
  }
}
