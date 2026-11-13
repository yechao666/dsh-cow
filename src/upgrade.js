/**
 * 子节点跟随主节点升级（基于子端 agent 的 plugin_manager 工具）。
 *
 * 流程：主端打包当前插件 → 通过加密 WS 文件通道把 tgz 推到子端 allowedRoots
 * → 给子端派一个升级任务，要求它用 plugin_manager 安装该 tgz
 * → 等待子端 hello 上报目标版本。
 *
 * 不依赖 supervisor：插件安装由子端 agent 完成；插件热重载后
 * WebSocket 会自动重连，重连后的版本号就是验收标准。
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { buildPluginTarball } from './tarball.js';
import { ensureDir } from './store.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createUpgradeService({
  root,
  pkg,
  files,
  tasks,
  peers,
  channel,
  home,
  logger,
  pollMs = 1000,
  timeoutMs = 120_000,
}) {
  const log = logger ?? console;

  async function upgradePeer(peer, { targetVersion = '' } = {}) {
    const target = String(targetVersion || pkg.version);
    if (target !== pkg.version) {
      throw new Error(`只支持升级到本机当前版本 ${pkg.version}，收到 ${target}`);
    }
    const registered = peers.get(peer);
    const status = channel?.status?.(peer);
    const info = {
      ...registered,
      connected: status ? status.state === 'connected' : Boolean(registered?.connected),
      version: status?.node?.version || registered?.node?.version || registered?.version || '',
    };
    if (!registered) throw new Error(`未知节点：${peer}`);
    if (registered.relation !== 'child') throw new Error(`只能升级直接下级：${peer}`);
    if (!info.connected) throw new Error(`子节点不在线：${peer}`);
    const current = String(info.version || '');
    if (current === target) {
      return { status: 'current', peer, version: current, message: '已经是最新版本' };
    }

    const archive = buildPluginTarball(root, { name: pkg.name, version: pkg.version });
    const sha256 = createHash('sha256').update(archive).digest('hex');
    const dir = join(home, 'cow', 'updates');
    ensureDir(dir);
    const localPath = join(dir, basename(`dsh-cow-${pkg.version}.tgz`));
    writeFileSync(localPath, archive, { mode: 0o600 });

    const sent = await files.sendFile({
      peer,
      localPath,
      remotePath: `cow-updates/${basename(localPath)}`,
    });
    const remotePath = String(sent?.files?.[0]?.remotePath || sent?.remotePath || '');
    if (!remotePath) throw new Error('升级包已发出，但没有拿到子端落盘路径');

    const prompt = [
      `你在执行 dsh-cow 自升级到 ${pkg.version}。`,
      `安装包已由主 DSH 通过加密通道发送到：${remotePath}`,
      `sha256：${sha256}`,
      '请立即调用 plugin_manager 工具：action="install_bundle"，target="' + remotePath + '"，',
      '不要调用其它 plugin_manager action，不要修改其它插件。',
      '安装完成后只回复「upgraded ' + pkg.version + '」；不要执行重启命令。',
    ].join('\n');

    const snapshot = tasks.assign({
      peer,
      cwd: dirname(remotePath),
      title: `升级 dsh-cow 到 ${pkg.version}`,
      prompt,
      timeoutSec: 900,
    });
    const task = tasks.get(snapshot.taskId);
    if (task) task.upgrade = true; // 父端只对升级任务的 plugin_manager 安装请求自动放行
    log.info?.(`[dsh-cow] 升级任务已派发 ${peer} -> ${pkg.version}（${snapshot.taskId}）`);

    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      await sleep(pollMs);
      const latestStatus = channel?.status?.(peer);
      const latestRegistered = peers.get(peer);
      if (String(latestStatus?.node?.version || latestRegistered?.node?.version || latestRegistered?.version || '') === target) {
        return {
          status: 'succeeded',
          peer,
          version: target,
          taskId: snapshot.taskId,
          remotePath,
          sha256,
          message: '子端已上报目标版本',
        };
      }
      const state = tasks.get(snapshot.taskId);
      if (state && ['failed', 'canceled', 'interrupted'].includes(state.status)) {
        return {
          status: 'needs_restart',
          peer,
          version: current,
          taskId: snapshot.taskId,
          remotePath,
          sha256,
          message: `安装任务已 ${state.status}，但子端尚未上报 ${target}；可能需要重启或重新启用插件`,
        };
      }
    }
    return {
      status: 'needs_restart',
      peer,
      version: String(channel?.status?.(peer)?.node?.version || current),
      taskId: snapshot.taskId,
      remotePath,
      sha256,
      message: `等待 ${Math.round(timeoutMs / 1000)}s 仍未看到子端上报 ${target}；安装可能已完成，需要重启子端加载新插件`,
    };
  }

  return { upgradePeer };
}
