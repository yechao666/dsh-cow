/**
 * 子端自动升级：收到父端 msg.upgrade 后，下载插件包、校验 sha256/包内版本，
 * 再通过 DSH 的 pluginManager 服务先移除旧包、安装新包。
 *
 * 升级消息本身只走一条 WebSocket 控制消息；不需要子端 Agent、不需要任务层。
 * 安装由子端插件进程完成；插件被 HMR 卸载/重载期间可能无法再回结果，
 * 最终以父端 hello 上报的版本为准。
 */
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readPackageJsonFromTarball } from './tarball.js';

const MAX_BYTES = 64 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 60_000;

function semverParts(value) {
  return String(value ?? '').replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function versionLess(a, b) {
  const left = semverParts(a);
  const right = semverParts(b);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if ((left[i] ?? 0) !== (right[i] ?? 0)) return (left[i] ?? 0) < (right[i] ?? 0);
  }
  return false;
}

async function fetchPackage(url, sha256) {
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('升级地址不是合法 URL'); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('升级地址只支持 http(s)');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    headers: { accept: 'application/octet-stream' },
  });
  if (!response.ok) throw new Error(`下载插件包失败：HTTP ${response.status}`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BYTES) throw new Error('插件包超过 64 MiB 上限');
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_BYTES) throw new Error('插件包超过 64 MiB 上限');
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== String(sha256).toLowerCase()) throw new Error('插件包 sha256 不匹配');
  return buffer;
}

export function createUpgradeService({ ctx, instance, peers, channel, home, logger }) {
  const log = logger ?? console;
  const inFlight = new Set();

  function parent() {
    return peers.list().find((peer) => peer.relation === 'parent') ?? null;
  }

  function notify(parentLabel, payload) {
    try {
      channel.send(parentLabel, { type: 'msg.upgrade.result', payload });
    } catch (error) {
      log.warn?.(`[dsh-cow] 升级结果发送失败：${error?.message ?? error}`);
    }
  }

  async function install(parentLabel, payload, pkg) {
    const notifyId = {
      messageId: payload.messageId,
      peerId: instance.peerId,
      peerName: instance.displayName ?? '',
      version: pkg.version,
    };
    notify(parentLabel, { ...notifyId, status: 'installing' });
    const manager = ctx.get('pluginManager');
    if (!manager?.removeBundle || !manager?.installBundle) {
      throw new Error('子端没有可用的 pluginManager 服务');
    }
    const dir = join(home, 'cow', 'updates');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${pkg.name}-${pkg.version}.tgz`);
    writeFileSync(file, pkg.buffer, { mode: 0o600 });
    try { chmodSync(file, 0o600); } catch { /* 忽略 */ }

    // HMR 下 installBundle 会拒绝已安装的包，必须先移除旧包。
    // removeBundle 会卸载当前插件；这段异步栈仍会继续执行到 installBundle。
    try {
      await manager.removeBundle(pkg.name);
    } catch (error) {
      if (!/not installed|未安装/i.test(String(error?.message ?? error))) throw error;
    }
    const result = await manager.installBundle(file, { enabled: true });
    notify(parentLabel, { ...notifyId, status: 'installed', result });
  }

  async function handle(payload) {
    const messageId = String(payload?.messageId ?? '');
    if (!messageId || inFlight.has(messageId)) return { status: 'ignored' };
    const from = parent();
    if (!from) return { status: 'ignored' };
    const pkg = payload?.package ?? {};
    const name = String(pkg.name ?? '');
    const version = String(pkg.version ?? '');
    const url = String(pkg.url ?? '');
    const sha256 = String(pkg.sha256 ?? '');
    if (name !== 'dsh-cow') throw new Error(`只允许升级 dsh-cow，收到 ${name || '(空)'}`);
    if (!version || !url || !/^[0-9a-f]{64}$/i.test(sha256)) throw new Error('升级消息缺少 version/url/sha256');
    if (!versionLess(String(instance.version ?? ''), version)) {
      notify(from.label, { messageId, peerId: instance.peerId, peerName: instance.displayName ?? '', version, status: 'current' });
      return { status: 'current' };
    }
    inFlight.add(messageId);
    try {
      log.info?.(`[dsh-cow] 收到升级消息：${name} ${instance.version} -> ${version}`);
      const buffer = await fetchPackage(url, sha256);
      const manifest = readPackageJsonFromTarball(buffer);
      if (manifest?.name !== name || String(manifest?.version) !== version) {
        throw new Error(`插件包内容不匹配：${manifest?.name}@${manifest?.version}`);
      }
      await install(from.label, payload, { name, version, buffer });
      log.info?.(`[dsh-cow] 升级包已安装 ${name}@${version}`);
      return { status: 'installed' };
    } catch (error) {
      const message = String(error?.message ?? error);
      log.warn?.(`[dsh-cow] 自动升级失败：${message}`);
      notify(from.label, {
        messageId,
        peerId: instance.peerId,
        peerName: instance.displayName ?? '',
        version,
        status: 'failed',
        error: message,
      });
      return { status: 'failed', error: message };
    } finally {
      inFlight.delete(messageId);
    }
  }

  return { handle };
}
