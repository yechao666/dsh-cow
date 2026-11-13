/**
 * cow_doctor：一键诊断包。
 *
 * 汇总版本、配置、通道状态、任务队列、文件统计与近期错误，写成一份可分享的 JSON。
 * 只收集诊断必需的信息：密码、token、凭据一律不写入。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { coDshDir } from './store.js';

const STATUSES = ['queued', 'running', 'succeeded', 'failed', 'canceled'];

function countByStatus(list) {
  const out = Object.fromEntries(STATUSES.map((key) => [key, 0]));
  for (const item of list) {
    const status = String(item?.status ?? '');
    if (status in out) out[status] += 1;
  }
  return out;
}

function recent(items, limit = 10) {
  return [...items]
    .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    .slice(0, limit)
    .map((item) => ({
      taskId: item.taskId,
      peer: item.peer,
      status: item.status,
      title: String(item.title ?? '').slice(0, 120),
      error: item.error ? String(typeof item.error === 'object' ? item.error.message ?? JSON.stringify(item.error) : item.error).slice(0, 500) : null,
      pendingQuestion: item.pendingQuestion?.question ?? null,
      createdAt: item.createdAt ?? null,
    }));
}

/**
 * @param {{
 *   instance: object,
 *   channel: object,
 *   peers: object,
 *   tasks: object,
 *   manager: object,
 *   files: object,
 *   home: string,
 *   resolveConfig: () => object,
 *   startedAt?: number,
 *   logger?: object,
 * }} deps
 */
export function createDoctor({ instance, channel, peers, tasks, manager, files, home, resolveConfig, startedAt = Date.now(), logger = console }) {
  return function doctor() {
    const cfg = resolveConfig();
    const connections = channel.connections?.() ?? [];
    const peerStates = peers.list().map((peer) => {
      const status = channel.status?.(peer.label) ?? {};
      return {
        label: peer.label,
        relation: peer.relation,
        instanceId: peer.instanceId ?? '',
        state: status.state ?? 'unknown',
        direction: status.direction ?? null,
        encrypted: status.e2e === true,
        lastError: status.lastError ?? null,
      };
    });
    const outbound = tasks.list();
    const inbound = manager?.list?.() ?? [];
    const report = {
      schema: 'cow/v1/doctor',
      generatedAt: new Date().toISOString(),
      uptimeSec: Math.round((Date.now() - startedAt) / 1000),
      instance: {
        instanceId: instance.instanceId,
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
        maxTaskMinutes: cfg.maxTaskMinutes ?? null,
        allowedRoots: String(cfg.allowedRoots ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      },
      channel: {
        connected: connections.length,
        encryptedConnections: peerStates.filter((item) => item.encrypted).length,
        peers: peerStates,
      },
      outboundTasks: {
        counts: countByStatus(outbound),
        total: outbound.length,
        recent: recent(outbound),
      },
      inboundTasks: {
        counts: countByStatus(inbound),
        total: inbound.length,
        recent: recent(inbound),
      },
      files: files?.stats?.() ?? null,
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
