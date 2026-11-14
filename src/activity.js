/**
 * cow 活动流：把消息、文件传输、节点连接等事件汇总成一条时间线，
 * 供设置页与「Cow 活动」侧边栏面板查看。只保留内存最近 N 条，不落盘。
 */
const DEFAULT_LIMIT = 200;

export class ActivityLog {
  constructor({ limit = DEFAULT_LIMIT, now = () => Date.now() } = {}) {
    this.limit = Math.max(1, Number(limit) || DEFAULT_LIMIT);
    this.now = now;
    this.items = [];
    this.nextId = 1;
  }

  /**
   * 追加一条活动。
   * @param {{kind?: string, text: string, peer?: string, messageId?: string, status?: string, detail?: object}} entry
   */
  add(entry) {
    const item = {
      id: this.nextId++,
      at: new Date(this.now()).toISOString(),
      kind: String(entry?.kind ?? 'info').slice(0, 24),
      text: String(entry?.text ?? '').slice(0, 500),
      peer: String(entry?.peer ?? '').slice(0, 160),
      messageId: String(entry?.messageId ?? '').slice(0, 120),
      status: String(entry?.status ?? '').slice(0, 24),
      ...(entry?.detail && typeof entry.detail === 'object' ? { detail: entry.detail } : {}),
    };
    this.items.unshift(item);
    if (this.items.length > this.limit) this.items.length = this.limit;
    return item;
  }

  list(limit = 100) {
    const count = Math.max(1, Math.min(this.limit, Number(limit) || 100));
    return this.items.slice(0, count);
  }

  clear() {
    this.items = [];
  }
}
