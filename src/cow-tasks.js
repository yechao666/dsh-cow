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
  constructor({ channel, instance, logger, now, home, queueTtlMs, files, activity }) {
    this.channel = channel;
    this.instance = instance;
    this.logger = logger ?? console;
    this.now = now ?? (() => Date.now());
    this.queueTtlMs = Number(queueTtlMs) > 0 ? Number(queueTtlMs) : 2 * 3600_000;
    this.tasks = new Map();
    this.dir = home ? join(coDshDir(home), 'out-tasks') : null;
    this.artifactRoot = home ? join(coDshDir(home), 'artifacts') : null;
    this.files = files ?? null;
    this.activity = activity ?? null;
    if (this.dir) this.#restore();
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

  assign({ peer, prompt, cwd = '', title = '', timeoutSec = 3600, workspaceName = '', taskId: requestedId = '' }) {
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
      type: 'task.assign',
      payload: {
        taskId: task.taskId,
        prompt: task.prompt,
        title: task.title,
        cwd: task.cwd,
        workspaceName: task.workspaceName ?? '',
        timeoutSec: task.timeoutSec ?? 3600,
        caller: this.instance.instanceId,
        callerLabel: this.instance.displayName ?? '',
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
      if (task.status !== 'queued') continue;
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
      if (this.#dispatch(task)) sent += 1;
      else remaining += 1;
    }
    if (sent || failed) this.logger.info?.(`[dsh-cow] 离线队列冲刷：发送 ${sent}，过期 ${failed}，剩余 ${remaining}`);
    return { sent, failed, remaining };
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
    const task = this.get(taskId);
    if (!task) return;
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

  /** 回答远端任务提出的问题。 */
  answer(taskId, answer) {
    const task = this.get(taskId);
    if (!task) throw new Error(`任务不存在：${taskId}`);
    const question = task.pendingQuestion;
    if (!question) throw new Error('该任务当前没有待回答的问题');
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
