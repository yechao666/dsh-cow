/**
 * 入站 token 表：`$DSH_HOME/cow/tokens.json`（0600，只存 sha256 摘要）。
 *
 * 通过 `bin/cow.mjs token add` 生成登记串；插件每次鉴权时热读文件，
 * 所以撤销 token 不需要重启 DSH。
 */
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';
import { issueToken, verifyToken } from './tokens.js';

export class TokenStore {
  constructor({ file } = {}) {
    this.file = file ?? join(coDshDir(), 'tokens.json');
    this.records = [];
    this.stamp = 0;
    this.load();
  }

  /**
   * 文件被 CLI 改过就重新加载：`cow token add/revoke` 不用重启 DSH 就生效。
   */
  #maybeReload() {
    try {
      const stamp = statSync(this.file).mtimeMs;
      if (stamp !== this.stamp) {
        this.stamp = stamp;
        this.load();
      }
    } catch {
      /* 文件不存在时保持内存状态 */
    }
  }

  load() {
    const data = readJson(this.file, null);
    this.records = Array.isArray(data?.tokens) ? data.tokens.filter((item) => item?.hash) : [];
    try {
      this.stamp = statSync(this.file).mtimeMs;
    } catch {
      this.stamp = 0;
    }
    return this.records;
  }

  save() {
    writeJsonAtomic(this.file, { schema: 1, updatedAt: new Date().toISOString(), tokens: this.records });
  }

  list() {
    this.#maybeReload();
    return this.records;
  }

  /**
   * 新增一条 token；返回明文，仅此一次可见。
   * 没给名字时先用一个临时标识，等子 DSH 连上来后按它的实例名改名（rename）。
   */
  add(label) {
    const { token, record } = issueToken(label);
    if (!record.label) record.label = `peer-${record.id.slice(-4)}`;
    this.records.push(record);
    this.save();
    return { token, record };
  }

  /** 改名（授权码本身不变；用于子 DSH 上报实例名后替换临时标识）。 */
  rename(id, label) {
    const record = this.records.find((item) => item.id === id);
    const next = String(label ?? '').trim().slice(0, 120);
    if (!record || !next || record.label === next) return record ?? null;
    record.label = next;
    this.save();
    return record;
  }

  /** 把登记串绑定到第一次使用它的实例；用于拒绝“一个邀请码多台机器共用”。 */
  bind(id, peerId) {
    const record = this.records.find((item) => item.id === id);
    const next = String(peerId ?? '').trim().slice(0, 128);
    if (!record || !next) return record ?? null;
    if (record.boundInstanceId === next) return record;
    record.boundInstanceId = next;
    record.boundAt = new Date().toISOString();
    this.save();
    return record;
  }

  boundInstance(id) {
    const record = this.records.find((item) => item.id === id);
    return record?.boundInstanceId ?? '';
  }

  revoke(idOrLabel) {
    const needle = String(idOrLabel ?? '');
    const record = this.records.find((item) => item.id === needle) ?? this.records.find((item) => item.label === needle);
    if (!record) return null;
    record.revoked = true;
    record.revokedAt = new Date().toISOString();
    this.save();
    return record;
  }

  /** 鉴权：返回命中的记录（用于审计与 lastUsedAt）。 */
  verify(token) {
    this.#maybeReload();
    const record = verifyToken(this.records, token);
    if (!record) return null;
    return record;
  }

  touch(id) {
    const record = this.records.find((item) => item.id === id);
    if (!record) return;
    const now = new Date();
    // 一分钟内不重复写盘，避免每个请求都落盘。
    if (record.lastUsedAt && now.getTime() - Date.parse(record.lastUsedAt) < 60_000) return;
    record.lastUsedAt = now.toISOString();
    this.save();
  }
}
