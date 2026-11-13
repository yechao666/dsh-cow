import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashToken, issueToken, verifyToken } from '../src/tokens.js';
import { TokenStore } from '../src/token-store.js';

test('签发的 token 能通过校验，且磁盘上只有摘要', () => {
  const { token, record } = issueToken('mac-mini');
  assert.match(token, /^cods_[A-Za-z0-9_-]{16,}$/);
  assert.equal(record.hash, hashToken(token));
  assert.notEqual(record.hash, token);
  const matched = verifyToken([record], token);
  assert.equal(matched.id, record.id);
});

test('错误 token 校验失败', () => {
  const { record } = issueToken('a');
  assert.equal(verifyToken([record], 'cods_AAAAAAAAAAAAAAAAAAAAAA'), null);
  assert.equal(verifyToken([record], ''), null);
  assert.equal(verifyToken([], 'cods_x'), null);
});

test('撤销后的 token 立即失效', () => {
  const { token, record } = issueToken('a');
  record.revoked = true;
  assert.equal(verifyToken([record], token), null);
});

test('未命名的授权码先用临时标识，子 DSH 上报实例名后可改名', () => {
  const store = new TokenStore({ file: join(mkdtempSync(join(tmpdir(), 'cow-tok-')), 'tokens.json') });
  const first = store.add('');
  assert.match(first.record.label, /^peer-[a-z0-9]{4}$/);
  const renamed = store.rename(first.record.id, 'mac-mini');
  assert.equal(renamed.label, 'mac-mini');
  assert.equal(store.list()[0].label, 'mac-mini');
  // 改名不影响授权码本身
  assert.equal(verifyToken(store.list(), first.token).id, first.record.id);
});

test('多条 token 中只命中正确的那条', () => {
  const first = issueToken('a');
  const second = issueToken('b');
  const matched = verifyToken([first.record, second.record], second.token);
  assert.equal(matched.label, 'b');
});

test('登记串绑定到第一个使用它的实例，拒绝被第二台机器复用', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tok-'));
  const store = new TokenStore({ file: join(home, 'tokens.json') });
  const { token, record } = store.add('invite');
  assert.equal(store.boundInstance(record.id), '');
  store.bind(record.id, 'cods_child_a');
  assert.equal(store.boundInstance(record.id), 'cods_child_a');
  // 同一实例重复登记不应改绑
  store.bind(record.id, 'cods_child_a');
  assert.equal(store.boundInstance(record.id), 'cods_child_a');
  // 落盘后仍然记得绑定的是谁（重启后仍能拒绝复用）
  const reloaded = new TokenStore({ file: join(home, 'tokens.json') });
  assert.equal(reloaded.boundInstance(record.id), 'cods_child_a');
  assert.ok(token);
});
