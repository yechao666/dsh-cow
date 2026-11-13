/**
 * 本地「我派出去了哪些任务」索引：`$DSH_HOME/cow/remote-tasks.json`。
 *
 * 只是 taskId → peer 的映射，让 `cow_task` 不必让模型记住是哪台主机；
 * 真正的任务状态永远以远端为准。
 */
import { join } from 'node:path';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';

export class RemoteTaskIndex {
  constructor({ file } = {}) {
    this.file = file ?? join(coDshDir(), 'remote-tasks.json');
    this.entries = new Map();
    this.load();
  }

  load() {
    const data = readJson(this.file, null);
    const list = Array.isArray(data?.tasks) ? data.tasks : [];
    this.entries = new Map(list.filter((item) => item?.taskId).map((item) => [item.taskId, item]));
    return this;
  }

  save() {
    const tasks = [...this.entries.values()].slice(-200);
    writeJsonAtomic(this.file, { schema: 1, updatedAt: new Date().toISOString(), tasks });
  }

  remember(taskId, peer, { originSessionId = '' } = {}) {
    const previous = this.entries.get(taskId) ?? {};
    this.entries.set(taskId, {
      ...previous,
      taskId,
      peer: peer.label,
      url: peer.url,
      instanceId: peer.instanceId ?? '',
      originSessionId: originSessionId || previous.originSessionId || '',
      createdAt: previous.createdAt ?? new Date().toISOString(),
      delivered: previous.delivered ?? false,
      awaited: false,
    });
    this.save();
    return this.entries.get(taskId);
  }

  get(taskId) {
    return this.entries.get(String(taskId ?? '')) ?? null;
  }

  /** 标记「本地正在等这个任务的结果」：这段时间里的完成通知不再注入。 */
  markAwaited(taskId, awaited = true) {
    const entry = this.entries.get(String(taskId ?? ''));
    if (!entry) return null;
    entry.awaited = Boolean(awaited);
    entry.awaitedAt = awaited ? new Date().toISOString() : null;
    this.save();
    return entry;
  }

  /** 记录该任务最新一条通知事件的时间，用来丢弃乱序到达的旧事件。 */
  markEvent(taskId, at) {
    const entry = this.entries.get(String(taskId ?? ''));
    if (!entry || !at) return entry ?? null;
    const incoming = Date.parse(at);
    const current = entry.lastEventAt ? Date.parse(entry.lastEventAt) : NaN;
    if (Number.isFinite(current) && Number.isFinite(incoming) && incoming < current) return entry;
    entry.lastEventAt = at;
    this.save();
    return entry;
  }

  /** 本地已经拿到终态（工具返回值里已经包含结果），后续通知只入收件箱。 */
  markDelivered(taskId) {
    const entry = this.entries.get(String(taskId ?? ''));
    if (!entry) return null;
    entry.delivered = true;
    entry.deliveredAt = new Date().toISOString();
    entry.awaited = false;
    this.save();
    return entry;
  }
}
