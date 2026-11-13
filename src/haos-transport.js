/**
 * Haos 中心化传输：把 cow 的 P2P 协作换成"经 Haos 转发"。
 *
 * 职责：
 *   1. 用 API Key 向 Haos 注册本实例，持久化 Haos 实例令牌；
 *   2. 心跳上报能力，让 Haos 的组织视图有数据；
 *   3. 从 Haos 读组织树（谁能派活给我、我能派给谁）；
 *   4. 把任务提交给 Haos、轮询结果；
 *   5. 轮询派给自己的任务，交给本机 TaskManager 执行，再回写结果。
 *
 * 插件自己的 `cods_` 身份保持不变；Haos 的 `ins_` 身份用于转发协议。
 */
import { join } from 'node:path';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';

const PROTOCOL = 'cow/v1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HaosTransport {
  /**
   * @param {{
   *   baseUrl: string,
   *   apiKey: string,
   *   displayName: () => string,
   *   capabilities: () => object[],
   *   onTask: (task: object) => Promise<void> | void,
   *   logger?: object,
   *   home?: string,
   *   fetchImpl?: Function,
   *   pollSeconds?: number,
   *   heartbeatSeconds?: number,
   *   relayDir?: string,
   * }} options
   */
  constructor({
    baseUrl,
    apiKey,
    displayName,
    capabilities,
    onTask,
    logger,
    home,
    fetchImpl,
    pollSeconds = 2,
    heartbeatSeconds = 30,
    relayDir,
  }) {
    this.baseUrl = String(baseUrl ?? '').replace(/\/+$/, '');
    this.apiKey = String(apiKey ?? '');
    this.displayName = displayName;
    this.capabilities = capabilities;
    this.onTask = onTask;
    this.logger = logger ?? console;
    this.fetch = fetchImpl ?? globalThis.fetch;
    this.pollMs = Math.max(500, Number(pollSeconds) * 1000 || 2000);
    this.heartbeatMs = Math.max(5_000, Number(heartbeatSeconds) * 1000 || 30_000);
    this.stateFile = join(relayDir ?? coDshDir(home), 'haos.json');
    this.state = readJson(this.stateFile, null) ?? {};
    if (this.state.baseUrl && this.state.baseUrl !== this.baseUrl) {
      // 换了 Haos 中心就重新注册
      this.state = {};
    }
    this.orgCache = null;
    this.orgAt = 0;
    this.pollTimer = null;
    this.heartbeatTimer = null;
    this.polling = false;
    this.stopped = false;
  }

  get enabled() {
    return Boolean(this.baseUrl && (this.apiKey || this.state.instanceToken));
  }

  async request(path, { method = 'GET', body, auth = 'instance', timeoutMs = 15_000 } = {}) {
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (auth === 'instance' && this.state.instanceToken) headers.authorization = `Bearer ${this.state.instanceToken}`;
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text };
      }
    }
    if (!response.ok) {
      const error = new Error(payload?.error?.message || payload?.message || `Haos HTTP ${response.status}`);
      error.status = response.status;
      error.code = payload?.error?.code || `http_${response.status}`;
      throw error;
    }
    return payload;
  }

  async #register() {
    if (!this.apiKey) throw new Error('缺少 Haos API Key，无法注册实例');
    const payload = await this.request('/api/plugin/v1/register', {
      method: 'POST',
      auth: 'none',
      body: {
        apiKey: this.apiKey,
        friendlyName: this.displayName(),
        clientInstanceId: this.state.clientInstanceId || undefined,
        capabilities: (this.capabilities() ?? []).filter((item) => item.available !== false).map((item) => item.id),
        capabilitySummary: (this.capabilities() ?? [])
          .filter((item) => item.available !== false)
          .map((item) => item.id)
          .slice(0, 12)
          .join(', '),
        mode: 'in-process',
        protocol: PROTOCOL,
      },
    });
    this.state = {
      baseUrl: this.baseUrl,
      instanceId: payload.instanceId,
      instanceToken: payload.instanceToken,
      instanceName: payload.instanceName,
      registeredAt: new Date().toISOString(),
    };
    writeJsonAtomic(this.stateFile, { schema: 1, ...this.state });
    this.logger.info?.(`[dsh-cow] 已注册到 Haos：${payload.instanceId}（${payload.instanceName ?? ''}）`);
    return this.state;
  }

  async ensureRegistered() {
    if (!this.state.instanceToken) return this.#register();
    try {
      await this.request('/api/plugin/v1/instance', { timeoutMs: 8_000 });
      return this.state;
    } catch (error) {
      if (error.status === 401) {
        this.state = {};
        return this.#register();
      }
      return this.state;
    }
  }

  async heartbeat() {
    await this.ensureRegistered();
    const capabilities = (this.capabilities() ?? []).filter((item) => item.available !== false).map((item) => item.id);
    await this.request('/api/plugin/v1/heartbeat', {
      method: 'POST',
      body: {
        capabilities,
        capabilitySummary: capabilities.slice(0, 12).join(', '),
        friendlyName: this.displayName(),
        mode: 'in-process',
      },
    }).catch((error) => this.logger.warn?.(`[dsh-cow] Haos 心跳失败：${error?.message ?? error}`));
  }

  /** 读组织树（带 10s 缓存）。 */
  async org({ force = false } = {}) {
    if (!force && this.orgCache && Date.now() - this.orgAt < 10_000) return this.orgCache;
    await this.ensureRegistered();
    const payload = await this.request('/api/plugin/v1/org');
    this.orgCache = payload ?? { org: null, members: [] };
    this.orgAt = Date.now();
    return this.orgCache;
  }

  selfMember(view) {
    const members = view?.members ?? [];
    return members.find((item) => item.instanceId === this.state.instanceId) ?? null;
  }

  /** 可被委派的对象：组织里除自己以外的成员。 */
  async members() {
    const view = await this.org();
    return (view.members ?? []).filter((item) => item.instanceId !== this.state.instanceId);
  }

  async createTask(body) {
    await this.ensureRegistered();
    return this.request('/api/plugin/v1/tasks', { method: 'POST', body });
  }

  async getTask(taskId) {
    return this.request(`/api/plugin/v1/tasks/${encodeURIComponent(taskId)}`);
  }

  async pending() {
    const payload = await this.request('/api/plugin/v1/tasks/pending');
    return payload?.tasks ?? [];
  }

  async claim(taskId) {
    return this.request(`/api/plugin/v1/tasks/${encodeURIComponent(taskId)}/claim`, { method: 'POST', body: {} });
  }

  async result(taskId, summary) {
    return this.request(`/api/plugin/v1/tasks/${encodeURIComponent(taskId)}/result`, {
      method: 'POST',
      body: { summary: String(summary ?? '').slice(0, 32_000) },
    });
  }

  async fail(taskId, { error, canceled = false } = {}) {
    return this.request(`/api/plugin/v1/tasks/${encodeURIComponent(taskId)}/fail`, {
      method: 'POST',
      body: { error: String(error ?? '任务失败').slice(0, 2_000), canceled },
    });
  }

  /** 等任务进入终态（调用方侧用）。 */
  async wait(taskId, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const task = await this.getTask(taskId);
      if (['succeeded', 'failed', 'canceled'].includes(task?.status)) return task;
      await sleep(700);
    }
    return this.getTask(taskId);
  }

  async tick() {
    if (this.polling || this.stopped) return;
    this.polling = true;
    try {
      const tasks = await this.pending();
      for (const task of tasks) {
        if (this.stopped) break;
        try {
          const claimed = await this.claim(task.taskId);
          this.logger.info?.(`[dsh-cow] Haos 转发任务 ${claimed.taskId}`);
          await this.onTask?.(claimed);
        } catch (error) {
          this.logger.warn?.(`[dsh-cow] 处理转发任务失败：${error?.message ?? error}`);
        }
      }
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 轮询 Haos 任务失败：${error?.message ?? error}`);
    } finally {
      this.polling = false;
    }
  }

  async start() {
    if (!this.enabled) return false;
    this.stopped = false;
    await this.ensureRegistered();
    await this.heartbeat();
    this.heartbeatTimer = setInterval(() => void this.heartbeat(), this.heartbeatMs);
    this.heartbeatTimer.unref?.();
    this.pollTimer = setInterval(() => void this.tick(), this.pollMs);
    this.pollTimer.unref?.();
    void this.tick();
    return true;
  }

  stop() {
    this.stopped = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.pollTimer = null;
    this.heartbeatTimer = null;
  }
}
