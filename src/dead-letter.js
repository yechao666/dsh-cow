/**
 * 消息死信：只记录无法再执行的消息，不进入任务队列。
 *
 * 触发条件：
 *   - 发送前 / 队列中已超过 expiresAt；
 *   - 对端收到时已超过 expiresAt；
 *   - 发件箱超过 MAX_OUTBOX 被挤出的旧消息。
 *
 * 死信不是重试队列：写入后可查询、导出、清理，不会被通道自动重投。
 */
import { join } from 'node:path';
import { readJson, writeJsonAtomic } from './store.js';

const DEFAULT_LIMIT = 200;

export class DeadLetterStore {
  constructor({ file = '', limit = DEFAULT_LIMIT, now = () => Date.now(), logger } = {}) {
    this.file = file;
    this.limit = Math.max(10, Number(limit) || DEFAULT_LIMIT);
    this.now = now;
    this.logger = logger ?? console;
    this.items = [];
    this.nextId = 1;
    this.#load();
  }

  #load() {
    if (!this.file) return;
    const data = readJson(this.file, null);
    const items = Array.isArray(data?.items) ? data.items : [];
    this.items = items.slice(-this.limit);
    const maxId = this.items.reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0);
    this.nextId = Math.max(1, maxId + 1);
  }

  #save() {
    if (!this.file) return;
    try {
      writeJsonAtomic(this.file, { schema: 1, updatedAt: new Date(this.now()).toISOString(), items: this.items });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 死信落盘失败: ${error?.message ?? error}`);
    }
  }

  /**
   * 记录一条死信；payload 只保留可读预览，避免把大消息/敏感正文重复落盘。
   */
  add(entry = {}) {
    const item = {
      id: this.nextId++,
      at: new Date(this.now()).toISOString(),
      direction: entry.direction === 'inbound' ? 'inbound' : 'outbound',
      reason: String(entry.reason ?? 'expired').slice(0, 40),
      peer: String(entry.peer ?? '').slice(0, 160),
      peerId: String(entry.peerId ?? '').slice(0, 120),
      messageId: String(entry.messageId ?? '').slice(0, 120),
      idempotencyKey: String(entry.idempotencyKey ?? '').slice(0, 160),
      type: String(entry.type ?? '').slice(0, 80),
      expiresAt: String(entry.expiresAt ?? '').slice(0, 40),
      preview: String(entry.preview ?? '').slice(0, 500),
    };
    this.items.push(item);
    if (this.items.length > this.limit) this.items.splice(0, this.items.length - this.limit);
    this.#save();
    return item;
  }

  list(limit = 100) {
    const count = Math.max(1, Math.min(this.limit, Number(limit) || 100));
    return this.items.slice(-count).reverse();
  }

  stats() {
    return {
      total: this.items.length,
      limit: this.limit,
      expired: this.items.filter((item) => item.reason === 'expired').length,
      overflow: this.items.filter((item) => item.reason === 'queue_overflow').length,
    };
  }

  clear() {
    this.items = [];
    this.#save();
  }
}

export function deadLetterPath(home) {
  return join(home ?? '', 'cow', 'dead-letters.json');
}
