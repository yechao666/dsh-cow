/**
 * cow_doctor：一键诊断包。
 *
 * 汇总版本、配置、通道状态、文件统计、活动流与待回答询问，写成一份可分享的 JSON。
 * 只收集诊断必需的信息：密码、token、凭据一律不写入。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { coDshDir } from './store.js';

function recentActivity(activity, limit = 10) {
  return (activity?.list?.(limit) ?? []).map((item) => ({
    at: item.at ?? null,
    kind: item.kind ?? '',
    peer: item.peer ?? '',
    status: item.status ?? '',
    text: String(item.text ?? '').slice(0, 200),
  }));
}

/**
 * @param {{
 *   instance: object,
 *   channel: object,
 *   peers: object,
 *   files: object,
 *   activity: object,
 *   router: object,
 *   home: string,
 *   resolveConfig: () => object,
 *   startedAt?: number,
 *   logger?: object,
 * }} deps
 */
export function createDoctor({ instance, channel, peers, files, activity, router, home, resolveConfig, startedAt = Date.now(), logger = console }) {
  return function doctor() {
    const cfg = resolveConfig();
    const connections = channel.connections?.() ?? [];
    const peerStates = peers.list().map((peer) => {
      const status = channel.status?.(peer.label) ?? {};
      return {
        label: peer.label,
        relation: peer.relation,
        peerId: peer.peerId ?? '',
        state: status.state ?? 'unknown',
        direction: status.direction ?? null,
        encrypted: status.e2e === true,
        lastError: status.lastError ?? null,
      };
    });
    const pendingAsks = router?.pending?.() ?? [];
    const report = {
      schema: 'cow/v1/doctor',
      generatedAt: new Date().toISOString(),
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      instance: {
        peerId: instance.peerId,
        displayName: instance.displayName ?? '',
        version: instance.version ?? '',
        role: instance.role ?? '',
        platform: instance.platform ?? null,
      },
      config: {
        enabled: cfg.enabled !== false,
        serverEnabled: cfg.serverEnabled !== false,
        listenHost: cfg.listenHost ?? '',
        listenPort: cfg.listenPort ?? null,
        channelDial: cfg.channelDial ?? '',
        maxFileMB: cfg.maxFileMB ?? null,
        maxConcurrentFiles: cfg.maxConcurrentFiles ?? null,
        allowedRoots: String(cfg.allowedRoots ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      },
      channel: {
        connected: connections.length,
        encryptedConnections: peerStates.filter((item) => item.encrypted).length,
        peers: peerStates,
      },
      messages: {
        pendingAsks: pendingAsks.length,
        asks: pendingAsks,
      },
      files: files?.stats?.() ?? null,
      activity: recentActivity(activity),
    };
    const dir = join(coDshDir(home), 'diagnostics');
    let path = '';
    try {
      mkdirSync(dir, { recursive: true });
      path = join(dir, `doctor-${report.generatedAt.replace(/[:.]/g, '-')}.json`);
      writeFileSync(path, JSON.stringify(report, null, 2), { mode: 0o600 });
    } catch (error) {
      logger.warn?.(`[dsh-cow] 诊断包写入失败：${error?.message ?? error}`);
    }
    return { path, report };
  };
}
