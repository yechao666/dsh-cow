/**
 * 实例身份：`$DSH_HOME/cow/instance.json`。
 *
 * instanceId 一经生成就不再变化 —— 对端用它做去重与审计，token 和它绑定。
 */
import { readFileSync } from 'node:fs';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';
import { decryptSecret, encryptSecret } from './secrets.js';

export const IDENTITY_FILE = 'instance.json';

export function identityPath(home) {
  return join(coDshDir(home), IDENTITY_FILE);
}

export function newInstanceId() {
  return `cow_${randomBytes(8).toString('hex')}`;
}

export function newOrgId() {
  return `org_${randomBytes(6).toString('hex')}`;
}

export function newPasswordSalt() {
  return randomBytes(12).toString('hex');
}

/** 连接密码只存加盐摘要；密码本身不落盘、不输出。 */
export function hashJoinPassword(password, salt) {
  return createHash('sha256').update(`${salt}:${String(password ?? '')}`, 'utf8').digest('hex');
}

/** challenge-response：证明方用 passwordHash 与 nonce 计算摘要，密码本身不上链路。 */
export function makeJoinProof(verifierHash, nonce) {
  return createHash('sha256').update(`${String(nonce ?? '')}:${String(verifierHash ?? '')}`, 'utf8').digest('hex');
}

export function verifyJoinProof(identity, nonce, proof) {
  if (!identity?.passwordHash || !nonce || !proof) return false;
  const expected = Buffer.from(makeJoinProof(identity.passwordHash, nonce), 'hex');
  const actual = Buffer.from(String(proof), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyJoinPassword(identity, password) {
  if (!identity?.passwordHash || !identity?.passwordSalt) return false;
  const presented = String(password ?? '');
  if (!presented) return false;
  const expected = Buffer.from(String(identity.passwordHash), 'hex');
  const actual = Buffer.from(hashJoinPassword(presented, identity.passwordSalt), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** 设置或更换连接密码（所有子 DSH 共用）。 */
export function setJoinPassword(home, password) {
  const identity = loadIdentity({ home });
  const salt = newPasswordSalt();
  const next = {
    ...identity,
    passwordSalt: salt,
    passwordHash: hashJoinPassword(password, salt),
    updatedAt: new Date().toISOString(),
  };
  delete next.joinKey;
  writeJsonAtomic(identityPath(home), next);
  return next;
}

/** 补全组织字段：老实例升级后默认成为自己组织的 leader（root）。 */
function normalizeOrg(identity) {
  const next = { ...identity };
  // 兼容旧的“连接密钥”字段：迁移成密码摘要，旧密钥就当作初始密码。
  if (!next.passwordHash) {
    if (next.joinKey) {
      const salt = newPasswordSalt();
      next.passwordSalt = salt;
      next.passwordHash = hashJoinPassword(next.joinKey, salt);
    }
    delete next.joinKey;
  }
  // 组织 ID 概念已移除：只保留「是否有上级」。
  delete next.orgId;
  // 首次运行生成持久 UUID（不可通过界面修改）。
  if (!next.uuid || typeof next.uuid !== 'string') next.uuid = randomUUID();
  if (next.role !== 'member') next.role = 'leader';
  if (!next.parent || typeof next.parent !== 'object') next.parent = null;
  return next;
}

/**
 * 读取（必要时创建）本实例身份。
 * @param {{home?: string, displayName?: string}} options
 */
export function loadIdentity({ home, displayName } = {}) {
  const file = identityPath(home);
  const existing = readJson(file, null);
  if (existing && typeof existing.instanceId === 'string' && (existing.instanceId.startsWith('cow_') || existing.instanceId.startsWith('cods_'))) {
    const normalized = normalizeOrg(existing);
    const plainParentPassword = normalized.parentPasswordEnc
      ? decryptSecret(home, normalized.parentPasswordEnc)
      : String(normalized.parentPassword ?? '');
    if (normalized.parentPassword && !normalized.parentPasswordEnc) {
      // 旧版本明文落盘：迁移成密文并删除明文字段。
      normalized.parentPasswordEnc = encryptSecret(home, normalized.parentPassword);
    }
    delete normalized.parentPassword;
    if (
      normalized.parentPasswordEnc !== existing.parentPasswordEnc ||
      normalized.orgId !== existing.orgId ||
      normalized.role !== existing.role ||
      normalized.uuid !== existing.uuid ||
      normalized.passwordHash !== existing.passwordHash ||
      normalized.joinKey !== existing.joinKey
    ) {
      try {
        writeJsonAtomic(file, { ...normalized, updatedAt: new Date().toISOString() });
      } catch {
        /* 只读环境下降级为内存字段 */
      }
    }
    return { ...normalized, parentPassword: plainParentPassword, file };
  }
  const identity = {
    schema: 1,
    instanceId: newInstanceId(),
    uuid: randomUUID(),
    createdAt: new Date().toISOString(),
    displayName: String(displayName ?? ''),
    role: 'leader',
    parent: null,
  };
  writeJsonAtomic(file, identity);
  return { ...identity, file };
}

/** 允许通过设置页改名，写入同一个身份文件。 */
export function updateIdentityName(home, displayName) {
  const file = identityPath(home);
  let current;
  try {
    current = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    current = { schema: 1, instanceId: newInstanceId(), createdAt: new Date().toISOString() };
  }
  const next = { ...current, displayName: String(displayName ?? '') };
  writeJsonAtomic(file, next);
  return next;
}

/** 就地更新身份文件里的少量字段（当前对外端点等），失败静默。 */

export function patchIdentity(home, patch) {
  const file = identityPath(home);
  let current;
  try {
    current = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    current = { schema: 1, instanceId: newInstanceId(), createdAt: new Date().toISOString() };
  }
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  if (Object.prototype.hasOwnProperty.call(patch, 'parentPassword')) {
    next.parentPasswordEnc = encryptSecret(home, patch.parentPassword);
    delete next.parentPassword;
  }
  writeJsonAtomic(file, next);
  return next;
}
