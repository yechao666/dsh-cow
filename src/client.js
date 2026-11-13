/**
 * 出站 HTTP 客户端：本实例调用远端 DSH。
 *
 * 所有调用都带 Bearer token；超时与取消都走 AbortSignal，长轮询用
 * `waitSec` 查询参数而不是长连接。
 */

export class PeerError extends Error {
  constructor(message, { status = 0, code = 'peer_error', peer = '', path = '' } = {}) {
    super(message);
    this.name = 'PeerError';
    this.status = status;
    this.code = code;
    this.peer = peer;
    this.path = path;
  }
}

function joinUrl(base, path) {
  const normalized = String(base ?? '').replace(/\/+$/, '');
  const suffix = String(path ?? '').startsWith('/') ? path : `/${path}`;
  return `${normalized}${suffix}`;
}

function withQuery(url, query) {
  if (!query) return url;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

export class PeerClient {
  constructor({ fetchImpl, instanceId = '' } = {}) {
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.instanceId = instanceId;
  }

  /**
   * @param {{url: string, token?: string, label?: string}} peer
   * @param {{method?: string, path: string, body?: unknown, query?: object,
   *          timeoutMs?: number, signal?: AbortSignal}} options
   */
  async request(peer, { method = 'GET', path, body, query, timeoutMs = 30_000, signal } = {}) {
    if (typeof this.fetch !== 'function') {
      throw new PeerError('当前 Node 运行时不支持 fetch（需要 Node 22+）', { peer: peer?.label, path });
    }
    const url = withQuery(joinUrl(peer.url, path), query);
    const headers = { accept: 'application/json' };
    if (peer.token) headers.authorization = `Bearer ${peer.token}`;
    // 共用连接密钥时，父端靠这个头区分是哪个下级。
    if (this.instanceId) headers['x-cow-instance'] = this.instanceId;
    if (body !== undefined) headers['content-type'] = 'application/json';

    const signals = [];
    if (timeoutMs > 0) signals.push(AbortSignal.timeout(timeoutMs));
    if (signal) signals.push(signal);
    const composed = signals.length === 0 ? undefined : signals.length === 1 ? signals[0] : AbortSignal.any(signals);

    let response;
    try {
      response = await this.fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: composed,
      });
    } catch (error) {
      const aborted = error?.name === 'AbortError' || error?.name === 'TimeoutError';
      throw new PeerError(
        aborted ? `请求 ${peer.label ?? peer.url} 超时（${timeoutMs}ms）` : `无法连接 ${peer.label ?? peer.url}：${error?.message ?? error}`,
        { code: aborted ? 'timeout' : 'unreachable', peer: peer?.label, path },
      );
    }

    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const code = payload?.error?.code ?? `http_${response.status}`;
      const message = payload?.error?.message ?? text.slice(0, 500) ?? response.statusText;
      throw new PeerError(message, { status: response.status, code, peer: peer?.label, path });
    }
    return payload;
  }

  /** 读取对端实例文档（能力、工作目录、并发限制）。 */
  info(peer, options = {}) {
    return this.request(peer, { path: '/instance', timeoutMs: 15_000, ...options });
  }

  health(peer, options = {}) {
    return this.request(peer, { path: '/health', timeoutMs: 8_000, ...options });
  }

  createTask(peer, body, options = {}) {
    return this.request(peer, { method: 'POST', path: '/tasks', body, timeoutMs: 30_000, ...options });
  }

  getTask(peer, taskId, { waitSec, ...options } = {}) {
    return this.request(peer, { path: `/tasks/${encodeURIComponent(taskId)}`, query: { waitSec }, ...options });
  }

  sendMessage(peer, taskId, body, options = {}) {
    return this.request(peer, {
      method: 'POST',
      path: `/tasks/${encodeURIComponent(taskId)}/messages`,
      body,
      ...options,
    });
  }

  /**
   * 双向登记握手：把自己的地址与「给对方用的 token」登记到对端，
   * 让主 DSH 能反向调用子 DSH（HTTP 派任务）。
   */
  registerPeer(peer, body, options = {}) {
    return this.request(peer, { method: 'POST', path: '/peers/register', body, timeoutMs: 15_000, ...options });
  }

  /** 长连接不可用时的消息兜底投递。 */
  postMessage(peer, body, options = {}) {
    return this.request(peer, { method: 'POST', path: '/messages', body, ...options });
  }

  cancelTask(peer, taskId, options = {}) {
    return this.request(peer, { method: 'POST', path: `/tasks/${encodeURIComponent(taskId)}/cancel`, body: {}, ...options });
  }
}
