import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveSessionKey, open, seal } from '../src/crypto.js';

test('同一 base/nonce 派生同一密钥，往返密封/打开', () => {
  const keyA = deriveSessionKey('hash-material', 'nonce-1');
  const keyB = deriveSessionKey('hash-material', 'nonce-1');
  assert.deepEqual(keyA, keyB);
  assert.equal(keyA.length, 32);
  const box = seal(keyA, { event: 'task.assign', payload: { taskId: 't1', prompt: '中文' } });
  assert.equal(box.v, 1);
  assert.equal(typeof box.data, 'string');
  const opened = open(keyB, box);
  assert.equal(opened.event, 'task.assign');
  assert.equal(opened.payload.prompt, '中文');
});

test('nonce 或密钥不同则无法解密；篡改密文会抛错', () => {
  const key = deriveSessionKey('hash-material', 'nonce-1');
  const other = deriveSessionKey('hash-material', 'nonce-2');
  const box = seal(key, { hello: 'world' });
  assert.throws(() => open(other, box));
  const tampered = { ...box, data: Buffer.from('tampered').toString('base64') };
  assert.throws(() => open(key, tampered));
});
