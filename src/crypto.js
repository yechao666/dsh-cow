/**
 * 帧级端到端加密：用挑战握手已经暴露给双方的派生材料生成本次连接的会话密钥，
 * 之后所有业务事件（含文件分块）都以 AES-256-GCM 密封在 `enc` 字段里。
 *
 * 密钥不落盘、不跨连接复用；重连时挑战 nonce 变化，密钥随之轮换。
 * hello / welcome / auth.challenge / ack / ping 等握手帧保持明文，便于兼容与排障。
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const ALG = 'aes-256-gcm';
const AAD = Buffer.from('cow/v1/e2e');
const KEY_LEN = 32;

/**
 * 从共用密码的派生值与会话 nonce 生成 32 字节会话密钥。
 * @param {string|Buffer} base 服务端为 passwordHash，拨号方为 hashJoinPassword(password, salt)
 * @param {string} nonce 挑战 nonce
 * @returns {Buffer}
 */
export function deriveSessionKey(base, nonce) {
  const material = typeof base === 'string' ? Buffer.from(base, 'utf8') : Buffer.from(base);
  if (!material.length) throw new Error('缺少派生材料');
  return Buffer.from(hkdfSync('sha256', material, Buffer.from(String(nonce ?? ''), 'utf8'), AAD, KEY_LEN));
}

/**
 * 密封一个 JSON 可序列化对象。
 * @returns {{v:1, iv:string, tag:string, data:string}}
 */
export function seal(key, value) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LEN) throw new Error('会话密钥无效');
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  cipher.setAAD(AAD);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
}

/**
 * 打开密封对象；篡改或密钥不匹配都会抛出。
 */
export function open(key, box) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_LEN) throw new Error('会话密钥无效');
  if (!box || typeof box !== 'object' || box.v !== 1) throw new Error('加密帧版本不支持');
  const iv = Buffer.from(String(box.iv ?? ''), 'base64');
  const tag = Buffer.from(String(box.tag ?? ''), 'base64');
  const data = Buffer.from(String(box.data ?? ''), 'base64');
  if (iv.length !== 12 || tag.length !== 16) throw new Error('加密帧参数无效');
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAAD(AAD);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  return JSON.parse(plain);
}
