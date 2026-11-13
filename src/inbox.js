/**
 * 收件箱：peer 推来的消息与任务通知。
 *
 * 通道只是传输；「这条消息要不要进会话」「要不要提示模型」由 NotificationRouter
 * 决定，收件箱负责留痕（审计）与给 `cow_inbox` 工具读取。
 */
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';

const MAX_ITEMS = 200;

export class Inbox {
  constructor({ file, limit = MAX_ITEMS } = {}) {
    this.file = file ?? join(coDshDir(), 'inbox.json');
    this.limit = limit;
    this.items = [];
    this.load();
  }

  load() {
    const data = readJson(this.file, null);
    this.items = Array.isArray(data?.items) ? data.items.slice(-this.limit) : [];
    return this.items;
  }

  save() {
    writeJsonAtomic(this.file, { schema: 1, updatedAt: new Date().toISOString(), items: this.items.slice(-this.limit) });
  }

  add({ from, type, payload, dedupeKey }) {
    if (dedupeKey) {
      const existing = this.items.find((item) => item.dedupeKey === dedupeKey);
      if (existing) return { item: existing, created: false };
    }
    const item = {
      id: `msg_${randomBytes(6).toString('hex')}`,
      at: new Date().toISOString(),
      from: String(from ?? ''),
      type: String(type ?? 'peer.message'),
      payload: payload ?? {},
      read: false,
      dedupeKey: dedupeKey ?? null,
    };
    this.items.push(item);
    if (this.items.length > this.limit) this.items = this.items.slice(-this.limit);
    this.save();
    return { item, created: true };
  }

  list({ limit = 20, unreadOnly = false } = {}) {
    const items = unreadOnly ? this.items.filter((item) => !item.read) : this.items;
    return items.slice(-Math.max(1, Math.min(limit, this.limit)));
  }

  unreadCount() {
    return this.items.filter((item) => !item.read).length;
  }

  markRead(ids) {
    const set = new Set(ids ?? this.items.map((item) => item.id));
    let changed = 0;
    for (const item of this.items) {
      if (set.has(item.id) && !item.read) {
        item.read = true;
        changed += 1;
      }
    }
    if (changed > 0) this.save();
    return changed;
  }

  prune(keepMs = 7 * 24 * 3600_000) {
    const cutoff = Date.now() - keepMs;
    const before = this.items.length;
    this.items = this.items.filter((item) => {
      const at = Date.parse(item.at);
      return !Number.isFinite(at) || at >= cutoff;
    });
    if (this.items.length !== before) this.save();
    return before - this.items.length;
  }
}
