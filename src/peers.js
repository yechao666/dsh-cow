/**
 * 出站 peer 登记表：`$DSH_HOME/cow/peers.json`。
 *
 * 每条记录是「我可以把任务派给谁」，含对端快照（能力文档），
 * 供 `cow_peers` / `cow_match` 离线使用；token 只在本机落盘 0600。
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';
import { decryptSecret, encryptSecret } from './secrets.js';
import { dirname } from 'node:path';

export const PEERS_FILE = 'peers.json';

export function peersPath(home) {
  return join(coDshDir(home), PEERS_FILE);
}

function normalizePeer(input) {
  if (!input || typeof input !== 'object') return null;
  const url = String(input.url ?? '').trim().replace(/\/+$/, '');
  // 子节点由它主动连主 DSH，不需要上报自身监听地址；允许子节点 url 为空。
  const relation = ['parent', 'child', 'peer'].includes(input.relation) ? input.relation : 'peer';
  if (!url && relation !== 'child') return null;
  const label = String(input.label ?? '').trim() || input.instanceId || 'peer';
  return {
    id: String(input.id ?? input.instanceId ?? `peer_${Math.random().toString(36).slice(2, 10)}`),
    label,
    url,
    token: String(input.token ?? ''),
    instanceId: String(input.instanceId ?? ''),
    uuid: String(input.uuid ?? ''),
    addedAt: input.addedAt ?? new Date().toISOString(),
    lastSeenAt: input.lastSeenAt ?? null,
    capabilitiesAt: input.capabilitiesAt ?? null,
    capabilities: Array.isArray(input.capabilities) ? input.capabilities : [],
    capabilitySummary: String(input.capabilitySummary ?? ''),
    workspaces: Array.isArray(input.workspaces) ? input.workspaces : [],
    limits: input.limits ?? null,
    relation,
    allowFiles: input.allowFiles !== false,
    maxFileMB: Number.isInteger(input.maxFileMB) && input.maxFileMB > 0 ? input.maxFileMB : null,
    orgId: String(input.orgId ?? ''),
    model: input.model ?? null,
  };
}

export class PeerRegistry {
  constructor({ file, logger } = {}) {
    this.file = file ?? peersPath();
    this.home = dirname(dirname(this.file));
    this.logger = logger ?? {};
    this.peers = [];
    this.stamp = 0;
    this.load();
  }

  /** 文件被 CLI 改过就重新加载（`cow enroll` 无需重启）。 */
  #maybeReload() {
    try {
      const stamp = statSync(this.file).mtimeMs;
      if (stamp !== this.stamp) {
        this.stamp = stamp;
        this.load();
      }
    } catch {
      /* 忽略 */
    }
  }

  load() {
    const data = readJson(this.file, null);
    const list = Array.isArray(data?.peers) ? data.peers : [];
    this.peers = list.map(normalizePeer).filter(Boolean);
    // 同一父节点可能被历史配置重复登记（不同端口/地址）；保留最新一条，避免 cow_peers 出现两个“主 DSH”。
    const unique = [];
    for (const peer of this.peers) {
      const existing = unique.findIndex((item) => item.relation === peer.relation && item.label === peer.label);
      if (existing < 0) { unique.push(peer); continue; }
      if (String(peer.addedAt ?? '') > String(unique[existing].addedAt ?? '')) unique[existing] = peer;
    }
    const changed = unique.length !== this.peers.length;
    this.peers = unique;
    for (const raw of list) {
      const peer = this.peers.find((item) => item.id === String(raw?.id ?? raw?.instanceId ?? ''));
      if (peer && raw?.tokenEnc) peer.token = decryptSecret(this.home, raw.tokenEnc);
    }
    try {
      this.stamp = statSync(this.file).mtimeMs;
    } catch {
      this.stamp = 0;
    }
    if (changed) this.save();
    return this.peers;
  }

  save() {
    const records = this.peers.map(({ token, ...rest }) => (
      token ? { ...rest, tokenEnc: encryptSecret(this.home, token) } : rest
    ));
    writeJsonAtomic(this.file, { schema: 1, updatedAt: new Date().toISOString(), peers: records });
  }

  list() {
    this.#maybeReload();
    return this.peers.map((peer) => ({ ...peer }));
  }

  /** 按 label / instanceId / id / url 查找。 */
  get(key) {
    this.#maybeReload();
    const needle = String(key ?? '').trim();
    if (!needle) return null;
    const lowered = needle.toLowerCase();
    return (
      this.peers.find((peer) => peer.label.toLowerCase() === lowered) ??
      this.peers.find((peer) => peer.instanceId && peer.instanceId === needle) ??
      this.peers.find((peer) => peer.id === needle) ??
      this.peers.find((peer) => peer.url.toLowerCase() === lowered) ??
      null
    );
  }

  /**
   * 生成一个不冲突的显示名：同名但不同实例时追加实例后缀。
   * 同实例改名时直接返回目标名（upsert 会更新原记录）。
   */
  uniqueLabel(desired, instanceId) {
    const base = String(desired ?? '').trim().slice(0, 120) || String(instanceId ?? '').slice(-8) || 'peer';
    const existing = this.get(base);
    if (!existing || !instanceId || existing.instanceId === instanceId) return base;
    const suffix = String(instanceId).slice(-6);
    let candidate = `${base}-${suffix}`;
    let index = 2;
    while (this.get(candidate) && this.get(candidate).instanceId !== instanceId) {
      candidate = `${base}-${suffix}-${index}`;
      index += 1;
    }
    return candidate;
  }

  /**
   * 登记 / 更新一个 peer。同一 instanceId 或同一 url 视为同一条。
   */
  upsert({ url, token, label, instanceId, uuid, relation, orgId, allowFiles, maxFileMB }) {
    const normalizedUrl = String(url ?? '').trim().replace(/\/+$/, '');
    const existing =
      this.peers.find((peer) => instanceId && peer.instanceId === instanceId) ??
      // 子节点 url 为空：不能用「空 url 相等」把它们合并成一条。
      (normalizedUrl ? this.peers.find((peer) => peer.url === normalizedUrl) : null);
    if (existing) {
      existing.url = normalizedUrl;
      if (token) existing.token = token;
      if (label) existing.label = label;
      if (instanceId) existing.instanceId = instanceId;
      if (uuid) existing.uuid = uuid;
      if (relation) existing.relation = relation;
      if (typeof allowFiles === 'boolean') existing.allowFiles = allowFiles;
      if (Number.isInteger(maxFileMB) && maxFileMB > 0) existing.maxFileMB = maxFileMB;
      if (orgId) existing.orgId = orgId;
      this.save();
      return { peer: { ...existing }, created: false };
    }
    const peer = normalizePeer({
      url: normalizedUrl,
      token,
      label: label || instanceId || normalizedUrl,
      allowFiles,
      maxFileMB,
      instanceId,
      relation,
      orgId,
      addedAt: new Date().toISOString(),
    });
    if (!peer) throw new Error('无法登记 peer：缺少 URL');
    this.peers.push(peer);
    this.save();
    return { peer: { ...peer }, created: true };
  }

  update(key, patch) {
    const peer = this.get(key);
    if (!peer) return null;
    Object.assign(peer, patch);
    this.save();
    return { ...peer };
  }

  remove(key) {
    const peer = this.get(key);
    if (!peer) return false;
    this.peers = this.peers.filter((item) => item.id !== peer.id);
    this.save();
    return true;
  }
}
