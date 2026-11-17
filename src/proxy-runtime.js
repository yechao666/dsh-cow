/**
 * 子端代理运行时：本地 HTTP 代理 + DSH 的全局 fetch 出口策略。
 *
 * 代理策略本身由 dsh-http-proxy 在启动时安装；这里在运行时重新安装一次，
 * 让开关不需要重启子 DSH。若当前安装版本不提供该库，或重装失败，则保留环境
 * 变量并标记 `restart`，由 UI 提示重启子 DSH 生效。
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { LocalProxy } from './local-proxy.js';
import { ProxyLog } from './proxy-log.js';

const PROXY_ENV = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY', 'all_proxy', 'ALL_PROXY', 'NODE_USE_ENV_PROXY'];

export class ProxyRuntime {
  constructor({ instance, resolveConfig, peers, channel, logger }) {
    this.instance = instance;
    this.resolveConfig = resolveConfig;
    this.peers = peers;
    this.channel = channel ?? null;
    this.logger = logger ?? console;
    this.local = null;
    this.disposer = null;
    this.savedEnv = null;
    this.mode = 'off';
    this.error = '';
    this.parentSignature = '';
    this.log = new ProxyLog(resolveConfig?.().proxyLogLimit ?? 50);
    this.refreshing = null;
  }

  #parent() {
    const peer = this.peers.list().find((item) => item.relation === 'parent') ?? null;
    const url = String(this.instance.parentUrl || peer?.url || '').trim();
    const password = String(this.instance.parentPassword || peer?.token || '');
    if (!url || !password) return null;
    // 代理认证要证明“我是哪个节点”：这里必须是本机 peerId，不能是父节点的。
    return { url, password, peerId: this.instance.peerId || '' };
  }

  #setEnv(port, parent) {
    if (!this.savedEnv) {
      this.savedEnv = Object.fromEntries(PROXY_ENV.map((name) => [name, process.env[name]]));
    }
    const proxy = `http://127.0.0.1:${port}`;
    let host = '';
    try { host = new URL(parent.url).hostname; } catch { /* ignore */ }
    const noProxy = ['localhost', '127.0.0.1', '::1', '[::1]', host].filter(Boolean).join(',');
    const values = {
      http_proxy: proxy,
      HTTP_PROXY: proxy,
      https_proxy: proxy,
      HTTPS_PROXY: proxy,
      no_proxy: noProxy,
      NO_PROXY: noProxy,
      all_proxy: proxy,
      ALL_PROXY: proxy,
      NODE_USE_ENV_PROXY: '1',
    };
    for (const [name, value] of Object.entries(values)) process.env[name] = value;
  }

  #restoreEnv() {
    if (!this.savedEnv) return;
    for (const [name, value] of Object.entries(this.savedEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    this.savedEnv = null;
  }

  async #installDispatcher() {
    const lookup = { get: (name) => (process.env[name] === undefined ? undefined : { value: process.env[name] }) };
    const candidates = [];
    if (process.env.DSH_INSTALL_DIR) {
      candidates.push(resolve(process.env.DSH_INSTALL_DIR, '..', 'dsh-http-proxy', 'lib', 'index.js'));
      candidates.push(resolve(process.env.DSH_INSTALL_DIR, '..', '..', 'dsh-http-proxy', 'lib', 'index.js'));
    }
    for (const file of candidates) {
      try {
        const mod = await import(pathToFileURL(file).href);
        if (typeof mod.installProxyFromEnvironment !== 'function') continue;
        this.disposer = await mod.installProxyFromEnvironment(lookup, (message) => this.logger.warn?.(`[dsh-cow] ${message}`));
        this.log.add('info', 'dispatcher_active', {});
        return 'active';
      } catch {
        /* try next */
      }
    }
    this.log.add('warn', 'dispatcher_restart_required', {});
    return 'restart';
  }

  async refresh(force = false) {
    if (this.refreshing) return this.refreshing;
    this.refreshing = this.#refresh(force).finally(() => { this.refreshing = null; });
    return this.refreshing;
  }

  async #refresh(force) {
    const config = this.resolveConfig();
    this.log.setLimit(config.proxyLogLimit ?? this.log.limit);
    if (!config.proxyViaParent) {
      await this.stop();
      return this.status();
    }
    const parent = this.#parent();
    if (!parent) {
      await this.stop();
      this.mode = 'error';
      this.error = '未配置主 DSH 地址或密码';
      return this.status();
    }
    const signature = `${parent.url}\n${parent.password}`;
    if (this.local?.server && !force && signature === this.parentSignature && this.mode !== 'error') {
      return this.status();
    }
    // 重新安装前先撤销旧 dispatcher / 环境，避免多层安装泄漏。
    await this.stop();
    try {
      this.local = new LocalProxy({ getParent: () => this.#parent(), logger: this.logger, log: this.log });
      const port = await this.local.start();
      this.parentSignature = signature;
      this.#setEnv(port, parent);
      this.mode = await this.#installDispatcher();
      this.error = this.mode === 'restart' ? '当前 DSH 不支持运行时重装代理，请重启子 DSH 生效' : '';
      this.log.add('info', 'runtime_started', { port, mode: this.mode });
      this.logger.info?.(`[dsh-cow] 子端代理已启动：127.0.0.1:${port} → ${parent.url}`);
    } catch (error) {
      this.mode = 'error';
      this.error = String(error?.message ?? error);
      this.log.add('error', 'runtime_failed', { message: this.error });
      this.logger.warn?.(`[dsh-cow] 子端代理启动失败：${this.error}`);
    }
    return this.status();
  }

  async stopLocalOnly() {
    const local = this.local;
    this.local = null;
    if (local) {
      try { await local.stop(); } catch { /* ignore */ }
    }
  }

  async stop() {
    const wasActive = this.mode !== 'off' || Boolean(this.local?.server);
    const disposer = this.disposer;
    this.disposer = null;
    if (disposer) {
      try { await disposer(); } catch { /* ignore */ }
    }
    await this.stopLocalOnly();
    this.#restoreEnv();
    this.mode = 'off';
    this.error = '';
    this.parentSignature = '';
    if (wasActive) this.log?.add?.('info', 'runtime_stopped', {});
    return this.status();
  }

  status() {
    const parent = this.peers.list().find((item) => item.relation === 'parent') ?? null;
    return {
      viaParent: Boolean(this.resolveConfig().proxyViaParent),
      mode: this.mode,
      error: this.error,
      parentConnected: Boolean(parent && this.channel?.status?.(parent.label)?.state === 'connected'),
      local: this.local?.status?.() ?? { running: false, port: 0, opened: 0, failed: 0, active: 0 },
      logs: this.log.list(),
      logLimit: this.log.limit,
    };
  }

  async dispose() {
    await this.stop();
  }
}
