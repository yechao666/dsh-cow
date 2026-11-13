/**
 * 入站 token（别的 DSH 访问本实例时出示的凭证）。
 *
 * 磁盘上只存 sha256 摘要，比较用 timingSafeEqual；撤销是打标记而不是删除，
 * 便于审计。
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const TOKEN_PREFIX = 'cods_';

export function newToken() {
  return TOKEN_PREFIX + randomBytes(24).toString('base64url');
}

export function hashToken(token) {
  return createHash('sha256').update(String(token ?? ''), 'utf8').digest('hex');
}

function digestBuffer(hex) {
  try {
    return Buffer.from(String(hex ?? ''), 'hex');
  } catch {
    return null;
  }
}

/**
 * 在 token 记录里找出匹配的一条。
 * @param {Array<{id?: string, label?: string, hash: string, revoked?: boolean}>} records
 * @param {string} token
 */
export function verifyToken(records, token) {
  if (!Array.isArray(records) || records.length === 0) return null;
  const presented = digestBuffer(hashToken(token));
  if (!presented) return null;
  let matched = null;
  for (const record of records) {
    if (!record || record.revoked === true) continue;
    const stored = digestBuffer(record.hash);
    if (!stored || stored.length !== presented.length) continue;
    // 不提前 break：保持每条记录都花同样的比较时间。
    if (timingSafeEqual(stored, presented)) matched = record;
  }
  return matched;
}

export function makeTokenRecord(label, { id, token, now } = {}) {
  const issuedAt = (now ?? new Date()).toISOString();
  return {
    id: id ?? `tok_${randomBytes(6).toString('hex')}`,
    label: String(label ?? '').trim().slice(0, 120),
    hash: hashToken(token),
    createdAt: issuedAt,
    lastUsedAt: null,
    revoked: false,
  };
}

/** 创建一条新 token：返回明文（只展示一次）与可持久化的记录。 */
export function issueToken(label, options = {}) {
  const token = options.token ?? newToken();
  return { token, record: makeTokenRecord(label, { ...options, token }) };
}
