/**
 * 代理运行日志：固定上限的内存环形缓冲。
 * 只记录可观测元数据（peer、host、port、状态、错误），不记录 URL 路径、
 * 请求头、正文或任何凭据。
 */
export class ProxyLog {
  constructor(limit = 50) {
    this.limit = Math.max(1, Math.min(200, Number(limit) || 50));
    this.entries = [];
  }

  add(level, event, fields = {}) {
    const entry = {
      at: new Date().toISOString(),
      level: ['info', 'warn', 'error'].includes(level) ? level : 'info',
      event: String(event ?? 'event'),
      ...fields,
    };
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
    return entry;
  }

  list(limit = this.limit) {
    const count = Math.max(1, Math.min(this.limit, Number(limit) || this.limit));
    return this.entries.slice(-count);
  }

  setLimit(limit) {
    this.limit = Math.max(1, Math.min(200, Number(limit) || this.limit));
    if (this.entries.length > this.limit) this.entries.splice(0, this.entries.length - this.limit);
  }

  clear() {
    this.entries.length = 0;
  }
}
