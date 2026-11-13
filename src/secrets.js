/**
 * 本机静态密钥：`$DSH_HOME/cow/local.key`（0600）。
 * 用于加密落盘的连接密码/上级密码，避免明文躺在 JSON 里。
 * 这不是硬件密钥库，只能降低“文件被拷走即泄露”的风险。
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { coDshDir } from './store.js';

const PREFIX = 'enc:v1:';

function keyPath(home) {
  return join(coDshDir(home), 'local.key');
}

function readKey(home) {
  const file = keyPath(home);
  try {
    if (existsSync(file)) {
      const key = Buffer.from(readFileSync(file, 'utf8').trim(), 'hex');
      if (key.length === 32) return key;
    }
  } catch {
    /* 重新生成 */
  }
  const key = randomBytes(32);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${key.toString('hex')}\n`, { mode: 0o600 });
  try { chmodSync(file, 0o600); } catch { /* 忽略 */ }
  return key;
}

export function isEncryptedSecret(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(home, plaintext) {
  const text = String(plaintext ?? '');
  if (!text) return '';
  const key = readKey(home);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
}

export function decryptSecret(home, value) {
  const text = String(value ?? '');
  if (!text) return '';
  if (!isEncryptedSecret(text)) return text;
  try {
    const [ivB64, tagB64, dataB64] = text.slice(PREFIX.length).split(':');
    const key = readKey(home);
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
