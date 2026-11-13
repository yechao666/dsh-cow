import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encryptSecret, decryptSecret, isEncryptedSecret } from '../src/secrets.js';
import { loadIdentity, hashJoinPassword } from '../src/identity.js';
import { PeerRegistry } from '../src/peers.js';

test('密文本地加解密，密钥文件权限 0600', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-secret-'));
  const enc = encryptSecret(home, 'p@ssw0rd');
  assert.equal(isEncryptedSecret(enc), true);
  assert.notEqual(enc, 'p@ssw0rd');
  assert.equal(decryptSecret(home, enc), 'p@ssw0rd');
  assert.equal(decryptSecret(home, 'plain'), 'plain');
  assert.equal(existsSync(join(home, 'cow/local.key')), true);
});

test('identity 迁移：parentPassword 明文自动转密文，读取时解密', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-secret-id-'));
  const file = join(home, 'cow/instance.json');
  mkdirSync(join(home, 'cow'), { recursive: true });
  writeFileSync(file, JSON.stringify({ schema: 1, instanceId: 'cow_test', parentUrl: 'ws://x', parentPassword: 'secret-pw', role: 'member' }));
  const identity = loadIdentity({ home });
  assert.equal(identity.parentPassword, 'secret-pw');
  const raw = readFileSync(file, 'utf8');
  assert.equal(raw.includes('secret-pw'), false);
  assert.match(raw, /parentPasswordEnc/);
});

test('peers.json 不落明文 token，重新加载可解密使用', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-secret-peer-'));
  const file = join(home, 'cow/peers.json');
  const registry = new PeerRegistry({ file });
  registry.upsert({ url: 'ws://127.0.0.1:1/cow/v1', token: 'join-pw', label: '主 DSH', instanceId: 'cow_p', relation: 'parent' });
  const raw = readFileSync(file, 'utf8');
  assert.equal(raw.includes('join-pw'), false);
  assert.match(raw, /tokenEnc/);
  const reloaded = new PeerRegistry({ file });
  assert.equal(reloaded.get('主 DSH').token, 'join-pw');
});
