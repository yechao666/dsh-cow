/**
 * 出站任务：主 DSH 通过 WebSocket 把任务帧发给子 DSH，子 DSH 完成后回传结果帧。
 *
 * 所有业务都在同一条长连接上以 JSON 帧传输（type: task.assign / task.progress /
 * task.result / task.cancel），不再有 HTTP 任务接口。
 */
import { randomBytes } from 'node:crypto';
import { readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { coDshDir, ensureDir, writeJsonAtomic } from './store.js';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled']);

function nowIso() {
  return new Date().toISOString();
}

export class CowTasks {
  constructor({ channel, instance, logger, now, home, queueTtlMs, retentionDays, autoContinueOnReconnect, askConcurrency, askFullTakeover, files, activity }) {
    this.channel = channel;
    this.instance = instance;
    this.logger = logger ?? console;
    this.now = now ?? (() => Date.now());
    this.queueTtlMs = Number(queueTtlMs) > 0 ? Number(queueTtlMs) : 2 * 3600_000;
    this.retentionDays = Number(retentionDays) > 0 ? Number(retentionDays) : 3;
    this.autoContinueOnReconnect = autoContinueOnReconnect !== false;
    this.askConcurrency = Number(askConcurrency) > 0 ? Math.min(20, Math.round(Number(askConcurrency))) : 2;
    this.askFullTakeover = askFullTakeover === true;
    this.askDecider = null;
    this.askInjector = null;
    this.askQueue = [];
    this.askActive = 0;
    this.tasks = new Map();
    this.unboundQuestions = new Map();
    this.dir = home ? join(coDshDir(home), 'out-tasks') : null;
    this.artifactRoot = home ? join(coDshDir(home), 'artifacts') : null;
    this.files = files ?? null;
    this.activity = activity ?? null;
    if (this.dir) { this.#restore(); this.prune(); }
  }

  /** 子端重连后给仍活着的任务发「继续」指令。 */
  #continue(task) {
    if (!this.autoContinueOnReconnect) return false;
    const sent = this.channel.send(task.peer, {
      type: 'task.continue',
      payload: {
        taskId: task.taskId,
        message: '连接已恢复。请继续完成当前任务；如果已经完成，请直接回报最终结果。',
      },
    });
    if (!sent.delivered) return false;
    task.status = 'running';
    task.error = null;
    task.progress = [...(task.progress ?? []), { at: nowIso(), kind: 'continue', text: '子端已重连，自动发送继续指令' }].slice(-20);
    this.#arm(task);
    return true;
  }

  /** 清理超过保留天数的终态任务记录（不动运行中/排队任务）。 */
  prune(days = this.retentionDays) {
    const cutoff = this.now() - Math.max(1, Number(days) || 3) * 86_400_000;
    let removed = 0;
    for (const [taskId, task] of this.tasks) {
      if (!TERMINAL.has(task.status)) continue;
      const at = Date.parse(task.finishedAt ?? task.createdAt ?? 0);
      if (!Number.isFinite(at) || at > cutoff) continue;
      this.tasks.delete(taskId);
      try { if (this.dir) unlinkSync(this.#file(taskId)); } catch { /* 忽略 */ }
      removed += 1;
    }
    return removed;
  }

  #file(taskId) {
    return join(this.dir, `${taskId}.json`);
  }

  #persist(task) {
    if (!this.dir) return;
    try {
      const { timer, ...record } = task;
      writeJsonAtomic(this.#file(task.taskId), record);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 出站任务落盘失败 ${task.taskId}: ${error?.message ?? error}`);
    }
  }

  #restore() {
    ensureDir(this.dir);
    let names = [];
    try {
      names = readdirSync(this.dir).filter((name) => name.endsWith('.json'));
    } catch {
      return;
    }
    for (const name of names) {
      let record;
      try {
        record = JSON.parse(readFileSync(join(this.dir, name), 'utf8'));
      } catch {
        continue;
      }
      if (!record?.taskId) continue;
      const task = { ...record, timer: null, progress: Array.isArray(record.progress) ? record.progress : [] };
      // 离线队列里的任务在重启后继续等待，运行中的任务才判中断。
      if (!TERMINAL.has(task.status) && task.status !== 'queued') {
        task.status = 'failed';
        task.error = 'DSH 进程重启，等待中的任务已中断；可用 cow_retry 重试';
        task.finishedAt = nowIso();
        this.#persist(task);
      }
      this.tasks.set(task.taskId, task);
    }
  }

  snapshot(task) {
    return {
      taskId: task.taskId,
      peer: task.peer,
      title: task.title,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      finishedAt: task.finishedAt,
      cwd: task.cwd,
      originSessionId: task.originSessionId ?? '',
      summary: task.summary ?? '',
      error: task.error ?? null,
      queuedAt: task.queuedAt ?? null,
      queueExpiresAt: task.expiresAt ?? null,
      attempts: task.attempts ?? 0,
      queuePosition: task.queuePosition ?? 0,
      pendingQuestion: task.pendingQuestion ?? null,
      artifacts: task.artifacts ?? [],
      progress: task.progress.slice(-20),
    };
  }

  get(taskId) {
    return this.tasks.get(String(taskId ?? '')) ?? null;
  }

  list() {
    return [...this.tasks.values()]
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
      .slice(0, 50)
      .map((task) => this.snapshot(task));
  }

  assign({ peer, prompt, cwd = '', title = '', timeoutSec = 3600, workspaceName = '', taskId: requestedId = '', originSessionId = '' }) {
    if (requestedId) {
      const existing = this.get(requestedId);
      if (existing) return this.snapshot(existing);
    }
    const taskId = requestedId || `cowtask_${randomBytes(9).toString('base64url')}`;
    const task = {
      taskId,
      peer,
      title: title || prompt.slice(0, 60).replace(/\s+/g, ' '),
      prompt,
      cwd,
      workspaceName,
      originSessionId: String(originSessionId ?? ''),
      status: 'running',
      createdAt: nowIso(),
      startedAt: nowIso(),
      finishedAt: null,
      summary: '',
      error: null,
      progress: [],
      timer: null,
    };
    this.tasks.set(taskId, task);
    this.#persist(task);
    this.activity?.add({ kind: 'task', text: `派发任务给 ${peer}：${task.title}`, peer, taskId, status: 'queued' });

    task.timeoutSec = timeoutSec;
    if (!this.#dispatch(task)) {
      this.#enqueue(task);
      return this.snapshot(task);
    }
    return this.snapshot(task);
  }

  /** 发一次 task.assign；未送达返回 false（调用方决定排队还是失败）。 */
  #dispatch(task) {
    const sent = this.channel.send(task.peer, {
      type: 'task.offer',
      payload: {
        taskId: task.taskId,
        title: task.title,
        claimTool: 'cow_claim',
        instruction: `请使用 cow_claim 工具认领任务 ${task.taskId}`,
      },
    });
    if (!sent.delivered) return false;
    this.#arm(task);
    return true;
  }

  #arm(task) {
    task.status = 'running';
    task.startedAt = nowIso();
    task.error = null;
    task.attempts = (task.attempts ?? 0) + 1;
    const timeoutMs = Math.max(5_000, Number(task.timeoutSec ?? 3600) * 1000 || 0);
    if (task.timer) clearTimeout(task.timer);
    task.timer = setTimeout(() => {
      if (TERMINAL.has(task.status)) return;
      task.status = 'failed';
      task.error = '等待远端结果超时';
      task.finishedAt = nowIso();
      this.#persist(task);
    }, timeoutMs);
    task.timer.unref?.();
    this.#persist(task);
  }

  #enqueue(task) {
    task.status = 'queued';
    task.queuedAt = nowIso();
    task.expiresAt = new Date(this.now() + this.queueTtlMs).toISOString();
    task.finishedAt = null;
    task.error = null;
    if (task.timer) clearTimeout(task.timer);
    task.timer = null;
    this.#persist(task);
    this.activity?.add({ kind: 'queue', text: `对端离线，任务进入队列：${task.title}`, peer: task.peer, taskId: task.taskId, status: 'queued' });
    this.logger.info?.(`[dsh-cow] 对端 ${task.peer} 未连接，任务 ${task.taskId} 进入离线队列`);
  }

  /**
   * 对端上线时冲刷离线队列。expired 的任务判失败，其余重新下发。
   * @param {string} [peer] 只冲刷某个节点；省略则全部。
   * @returns {{sent:number,failed:number,remaining:number}}
   */
  flushQueue(peer) {
    let sent = 0;
    let failed = 0;
    let remaining = 0;
    for (const task of this.tasks.values()) {
      if (task.status !== 'queued' && task.status !== 'awaiting_peer') continue;
      if (peer && task.peer !== peer) {
        remaining += 1;
        continue;
      }
      if (task.expiresAt && Date.parse(task.expiresAt) <= this.now()) {
        task.status = 'failed';
        task.error = '离线队列等待超时，远端一直未连接；可用 cow_retry 重试';
        task.finishedAt = nowIso();
        this.#persist(task);
        failed += 1;
        continue;
      }
      if (task.status === 'awaiting_peer') {
        if (this.#continue(task)) sent += 1;
        else remaining += 1;
      } else if (this.#dispatch(task)) {
        sent += 1;
      }
      else remaining += 1;
    }
    if (sent || failed) this.logger.info?.(`[dsh-cow] 离线队列冲刷：发送 ${sent}，过期 ${failed}，剩余 ${remaining}`);
    return { sent, failed, remaining };
  }

  /**
   * 子端以目标版本重连后，把仍在等待的升级任务标记为成功。
   * plugin_manager 安装会卸载插件，旧任务会话可能来不及回传结果。
   */
  reconcileUpgrade(peer, version) {
    const target = String(version ?? '');
    if (!target) return 0;
    let changed = 0;
    for (const task of this.tasks.values()) {
      if (!task.upgrade || String(task.peer ?? '') !== String(peer ?? '')) continue;
      if (!['queued', 'running'].includes(task.status)) continue;
      if (!task.upgradeTarget || String(task.upgradeTarget) !== target) continue;
      task.status = 'succeeded';
      task.summary = `子端已重连并上报目标版本 ${target}`;
      task.error = null;
      task.finishedAt = nowIso();
      task.progress = [...(task.progress ?? []), { at: nowIso(), kind: 'done', text: `子端已上报 ${target}` }].slice(-20);
      this.#persist(task);
      changed += 1;
    }
    return changed;
  }

  /**
   * 子端掉线：把执行中的任务改为「等待节点上线」，不判失败。
   * 子端重连后 flushQueue 会用同一 taskId 重发；子端按 taskId 幂等处理。
   */
  peerOffline(peer) {
    let changed = 0;
    for (const task of this.tasks.values()) {
      if (String(task.peer ?? '') !== String(peer ?? '')) continue;
      if (task.status !== 'running') continue;
      if (task.timer) clearTimeout(task.timer);
      task.timer = null;
      task.status = 'awaiting_peer';
      task.error = null;
      task.expiresAt = new Date(this.now() + this.queueTtlMs).toISOString();
      task.progress = [...(task.progress ?? []), { at: nowIso(), kind: 'peer', text: '子端离线，等待重新上线' }].slice(-20);
      this.#persist(task);
      this.activity?.add({ kind: 'queue', text: `子端离线，任务等待重连：${task.title}`, peer, taskId: task.taskId, status: 'awaiting_peer' });
      changed += 1;
    }
    return changed;
  }

  /** 重试一个失败/取消/中断的出站任务，沿用同一个 taskId。 */
  retry(taskId, { timeoutSec = 3600 } = {}) {
    const task = this.get(taskId);
    if (!task) throw new Error(`任务不存在：${taskId}`);
    if (!TERMINAL.has(task.status)) return this.snapshot(task);
    task.status = 'running';
    task.error = null;
    task.summary = '';
    task.progress = [];
    task.startedAt = nowIso();
    task.finishedAt = null;
    task.status = 'running';
    task.timeoutSec = timeoutSec;
    if (!this.#dispatch(task)) {
      this.#enqueue(task);
    }
    return this.snapshot(task);
  }

  /** 处理来自 WebSocket 的 task.progress / task.result 帧。 */
  onEvent({ from, event, payload }) {
    const taskId = String(payload?.taskId ?? '');
    if (event === 'task.claim') {
      this.#handleClaim(taskId, from);
      return;
    }
    const task = this.get(taskId);
    if (!task) {
      // 未绑定出站任务的审批/提问（子端本地会话也接管）：存为待人工问题。
      if (event === 'task.question' && payload?.questionId) {
        this.unboundQuestions.set(String(payload.questionId), {
          questionId: String(payload.questionId),
          from: String(from ?? ''),
          taskId,
          question: String(payload?.question ?? '').slice(0, 2000),
          options: Array.isArray(payload?.options) ? payload.options.slice(0, 10).map(String) : [],
          askedAt: nowIso(),
        });
        this.activity?.add({ kind: 'question', text: `子 DSH 待处理：${String(payload?.question ?? '').slice(0, 160)}`, peer: String(from ?? ''), taskId });
        this.#enqueueAsk({ kind: 'unbound', questionId: String(payload.questionId), from: String(from ?? ''), taskId, question: String(payload?.question ?? ''), options: Array.isArray(payload?.options) ? payload.options.map(String) : [] });
      }
      return;
    }
    if (event === 'task.progress') {
      if (TERMINAL.has(task.status)) return;
      const nextStatus = String(payload?.status ?? '');
      if (nextStatus === 'queued' || nextStatus === 'running') {
        task.status = nextStatus;
        task.queuePosition = nextStatus === 'queued' ? Math.max(1, Number(payload?.position) || 1) : 0;
        if (nextStatus === 'running' && !task.startedAt) task.startedAt = nowIso();
      }
      const text = String(payload?.text ?? '').slice(0, 500);
      const seq = Number(payload?.seq) || (task.progress.at(-1)?.seq ?? 0) + 1;
      if (text) {
        task.progress.push({
          at: nowIso(),
          seq,
          kind: String(payload?.kind ?? 'phase').slice(0, 20),
          text,
          ...(payload?.tool ? { tool: String(payload.tool).slice(0, 80) } : {}),
        });
        if (task.progress.length > 200) task.progress = task.progress.slice(-200);
      }
      this.#persist(task);
      return;
    }
    if (event === 'task.question') {
      if (TERMINAL.has(task.status)) return;
      task.pendingQuestion = {
        questionId: String(payload?.questionId ?? ''),
        question: String(payload?.question ?? '').slice(0, 2000),
        options: Array.isArray(payload?.options) ? payload.options.slice(0, 10).map(String) : [],
        askedAt: nowIso(),
      };
      task.progress.push({ at: nowIso(), kind: 'question', text: `等待回答：${task.pendingQuestion.question.slice(0, 200)}` });
      this.activity?.add({ kind: 'question', text: `远端提问：${task.pendingQuestion.question}`, peer: task.peer, taskId });
      this.#persist(task);
      if (!task.upgrade && !this.#injectAsk(task)) {
        this.#enqueueAsk({ kind: 'task', taskId, from: task.peer, question: task.pendingQuestion.question, options: task.pendingQuestion.options });
      }
      // 升级任务：只自动放行 plugin_manager 的 install_bundle，其它审批仍回到人工。
      if (task.upgrade && /plugin_manager/i.test(task.pendingQuestion.question) && /install_bundle/i.test(task.pendingQuestion.question)) {
        setImmediate(() => {
          try { this.answer(taskId, '允许一次'); } catch { /* 已超时或已取消 */ }
        });
      }
      return;
    }
    if (event === 'task.result') {
      if (TERMINAL.has(task.status)) return;
      const status = TERMINAL.has(String(payload?.status)) ? String(payload.status) : 'failed';
      task.status = status;
      task.summary = String(payload?.summary ?? '');
      task.error = payload?.error ? String(payload.error) : null;
      task.finishedAt = nowIso();
      task.artifacts = Array.isArray(payload?.artifacts)
        ? payload.artifacts.slice(0, 50).map((item) => ({
            name: String(item?.name ?? ''),
            path: String(item?.path ?? ''),
            bytes: Number(item?.bytes) || 0,
            sha256: String(item?.sha256 ?? ''),
            modifiedAt: item?.modifiedAt ?? null,
          }))
        : [];
      if (task.timer) clearTimeout(task.timer);
      this.#persist(task);
      this.activity?.add({
        kind: 'result',
        text: `任务${status === 'succeeded' ? '完成' : status === 'canceled' ? '取消' : '失败'}：${task.title}`,
        peer: task.peer,
        taskId,
        status,
        ...(task.artifacts?.length ? { detail: { artifacts: task.artifacts.length } } : {}),
      });
      void this.#autoPullArtifacts(task);
      this.logger.info?.(`[dsh-cow] 任务 ${taskId} 结束：${status}`);
    }
  }

  /** 小产物自动回传到本地 artifacts/<taskId>/；大文件保留 path 由用户手动取。 */
  async #autoPullArtifacts(task) {
    if (!this.files?.requestFile || !this.artifactRoot) return;
    const limit = 10 * 1024 * 1024;
    for (const item of task.artifacts ?? []) {
      if (!item.path || item.bytes > limit || item.localPath) continue;
      try {
        const got = await this.files.requestFile({
          peer: task.peer,
          remotePath: item.path,
          localPath: join(this.artifactRoot, task.taskId, item.name || 'artifact'),
        });
        item.localPath = got.localPath;
        item.sha256 = got.sha256 || item.sha256;
      } catch (error) {
        item.error = String(error?.message ?? error).slice(0, 300);
      }
      this.#persist(task);
    }
  }

  #sendBody(task) {
    return this.channel.send(task.peer, {
      type: 'task.body',
      payload: {
        taskId: task.taskId,
        prompt: task.prompt,
        title: task.title,
        cwd: task.cwd,
        workspaceName: task.workspaceName ?? '',
        timeoutSec: task.timeoutSec ?? 3600,
        caller: this.instance.instanceId,
        callerLabel: this.instance.displayName ?? '',
        claimTool: 'cow_claim',
      },
    });
  }

  /** 子端执行前认领；消息不存在/已结束则拒绝，避免做无用功。 */
  #handleClaim(taskId, from) {
    this.logger.info?.(`[dsh-cow] 收到认领 ${taskId} from=${from || '(empty)'}`);
    const task = this.get(taskId);
    if (!task) {
      this.channel.send(from, { type: 'task.claim.abort', payload: { taskId, reason: '消息不存在或已被删除' } });
      return;
    }
    if (from && task.peer !== from) {
      this.channel.send(from, { type: 'task.claim.abort', payload: { taskId, reason: '该消息不属于当前子节点' } });
      return;
    }
    if (TERMINAL.has(task.status)) {
      this.channel.send(from, { type: 'task.claim.abort', payload: { taskId, reason: `消息已${task.status === 'succeeded' ? '完成' : '结束'}` } });
      return;
    }
    task.status = 'running';
    task.claimedAt = nowIso();
    task.startedAt = task.startedAt ?? task.claimedAt;
    this.#persist(task);
    const target = from || task.peer;
    this.channel.send(target, { type: 'task.claim.ok', payload: { taskId } });
    this.logger.info?.(`[dsh-cow] 认领通过 ${taskId} -> ${target}，下发正文`);
    this.#sendBody(task);
  }

  setAskPolicy({ concurrency, fullTakeover, decider } = {}) {
    if (Number.isFinite(Number(concurrency)) && Number(concurrency) > 0) {
      this.askConcurrency = Math.min(20, Math.max(1, Math.round(Number(concurrency))));
    }
    if (typeof fullTakeover === 'boolean') this.askFullTakeover = fullTakeover;
    if (typeof decider === 'function') this.askDecider = decider;
    this.#pumpAsk();
  }

  setAskInjector(injector) {
    if (typeof injector === 'function') this.askInjector = injector;
  }

  /** 把询问作为特殊消息注入主 DSH 的原始会话。 */
  #injectAsk(task) {
    if (!this.askFullTakeover || !this.askInjector || !task.originSessionId) return false;
    const question = task.pendingQuestion;
    if (!question) return false;
    if (question.questionId && task.askInjectedFor === question.questionId) return true;
    const options = Array.isArray(question.options) && question.options.length
      ? `\n选项：${question.options.join(' / ')}`
      : '';
    const text = [
      '[COW 询问]',
      `- 子节点：${task.peer}`,
      `- 任务：${task.title || task.taskId}`,
      `- 任务 ID：${task.taskId}`,
      `- 问题：${question.question}`,
      options.trim() ? `- 选项：${question.options.join(' / ')}` : '',
      '',
      '请根据任务目标决定，并调用：',
      `\`cow_answer(taskId="${task.taskId}", answer="允许一次" 或 "拒绝" 或具体回答)\``,
    ].filter(Boolean).join('\n');
    try {
      const ok = this.askInjector(task.originSessionId, text);
      if (ok) {
        task.askInjectedFor = question.questionId ?? null;
        task.awaitingMain = true;
        task.progress = [...(task.progress ?? []), { at: nowIso(), kind: 'ask', text: '已注入主 DSH 会话等待决定' }].slice(-20);
        this.#persist(task);
      }
      return Boolean(ok);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 询问注入主会话失败：${error?.message ?? error}`);
      return false;
    }
  }

  #enqueueAsk(item) {
    this.askQueue.push(item);
    this.#pumpAsk();
  }

  #pumpAsk() {
    if (!this.askFullTakeover || !this.askDecider) return;
    while (this.askActive < this.askConcurrency && this.askQueue.length > 0) {
      const item = this.askQueue.shift();
      this.askActive += 1;
      Promise.resolve()
        .then(() => this.askDecider(item))
        .then((answer) => {
          if (!answer) return;
          if (item.kind === 'unbound') this.answerQuestion(item.questionId, answer);
          else this.answer(item.taskId, answer);
        })
        .catch((error) => {
          this.logger.warn?.(`[dsh-cow] 自动处理询问失败：${error?.message ?? error}`);
        })
        .finally(() => {
          this.askActive = Math.max(0, this.askActive - 1);
          this.#pumpAsk();
        });
    }
  }

  /** 未绑定任务的待回答问题（本地会话审批等）。 */
  pendingQuestions() {
    return [...this.unboundQuestions.values()];
  }

  /** 回答未绑定任务的提问（按 questionId）。 */
  answerQuestion(questionId, answer) {
    this.askQueue = this.askQueue.filter((item) => item.questionId !== String(questionId));
    const question = this.unboundQuestions.get(String(questionId));
    if (!question) throw new Error('该问题已处理或不存在');
    this.channel.send(question.from, {
      type: 'task.answer',
      payload: { taskId: question.taskId || '', questionId: question.questionId, answer: String(answer ?? '') },
    });
    this.unboundQuestions.delete(String(questionId));
    this.activity?.add({ kind: 'answer', text: `已回答子 DSH：${String(answer ?? '').slice(0, 120)}`, peer: question.from, taskId: question.taskId });
    return { ok: true, questionId: question.questionId };
  }

  /** 回答远端任务提出的问题。 */
  answer(taskId, answer) {
    this.askQueue = this.askQueue.filter((item) => !(item.kind === 'task' && item.taskId === taskId));
    const task = this.get(taskId);
    if (!task) throw new Error(`任务不存在：${taskId}`);
    const question = task.pendingQuestion;
    if (!question) throw new Error('该任务当前没有待回答的问题');
    task.awaitingMain = false;
    this.channel.send(task.peer, {
      type: 'task.answer',
      payload: { taskId: task.taskId, questionId: question.questionId, answer: String(answer ?? '') },
    });
    task.pendingQuestion = null;
    task.progress.push({ at: nowIso(), kind: 'answer', text: `已回答：${String(answer ?? '').slice(0, 200)}` });
    this.activity?.add({ kind: 'answer', text: `已回答远端提问：${String(answer ?? '').slice(0, 120)}`, peer: task.peer, taskId });
    this.#persist(task);
    return this.snapshot(task);
  }

  cancel(taskId, reason = '调用方取消') {
    const task = this.get(taskId);
    if (!task) throw new Error(`任务不存在：${taskId}`);
    if (TERMINAL.has(task.status)) return this.snapshot(task);
    this.channel.send(task.peer, { type: 'task.cancel', payload: { taskId, reason } });
    task.status = 'canceled';
    task.error = reason;
    task.finishedAt = nowIso();
    if (task.timer) clearTimeout(task.timer);
    this.#persist(task);
    return this.snapshot(task);
  }

  /** 子节点处理 task.assign：调用本地 TaskManager 执行，并回传结果帧。 */
  async runInbound({ payload, from, manager, channel, logger }) {
    const { validateCreateTask } = await import('./protocol.js');
    const taskId = String(payload?.taskId ?? '');
    const reply = (body) => channel.send(from, { type: 'task.result', payload: { taskId, ...body } });
    const validated = validateCreateTask({
      prompt: payload?.prompt,
      title: payload?.title,
      cwd: payload?.cwd,
      timeoutSec: payload?.timeoutSec,
      caller: payload?.caller,
      chain: [],
    });
    if (!validated.ok) {
      reply({ status: 'failed', summary: '', error: validated.message });
      return;
    }
    try {
      const snapshot = manager.create(validated.value, { callerLabel: payload?.callerLabel || from });
      channel.send(from, { type: 'task.progress', payload: { taskId, text: '已接受任务，开始执行' } });
      const done = await manager.wait(snapshot.taskId, Math.max(5_000, Number(validated.value.timeoutSec ?? 3600) * 1000));
      reply({
        status: done.status,
        summary: done.summary ?? '',
        error: done.error ? (done.error.message ?? String(done.error)) : null,
      });
    } catch (error) {
      logger.warn?.(`[dsh-cow] 执行任务失败：${error?.message ?? error}`);
      reply({ status: 'failed', summary: '', error: String(error?.message ?? error) });
    }
  }
}
