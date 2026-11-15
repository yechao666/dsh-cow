import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadIdentity, patchIdentity } from '../src/identity.js';

test('新实例默认是组织根（leader，不再生成 orgId）', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-id-'));
  const identity = loadIdentity({ home, displayName: 'team-lead' });
  assert.equal(identity.orgId, undefined);
  assert.equal(identity.role, 'leader');
  assert.equal(identity.parent, null);
});

test('老实例升级时自动补齐组织字段并落盘', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-id-'));
  const file = join(home, 'cow', 'instance.json');
  mkdirSync(join(home, 'cow'), { recursive: true });
  // 模拟旧格式：没有 orgId / role
  writeFileSync(file, JSON.stringify({ schema: 1, peerId: 'cods_old000000000', createdAt: new Date().toISOString() }), 'utf8');
  const identity = loadIdentity({ home });
  assert.equal(identity.peerId, 'cods_old000000000');
  assert.equal(identity.orgId, undefined);
  assert.equal(identity.role, 'leader');
  assert.equal(loadIdentity({ home }).role, 'leader');
});

test('加入上级后角色变为 member，parent 持久化', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-id-'));
  loadIdentity({ home });
  patchIdentity(home, {
    role: 'member',
    parent: { peerId: 'cods_parent', label: 'team-lead', url: 'http://lead/cow/v1' },
  });
  const loaded = loadIdentity({ home });
  assert.equal(loaded.orgId, undefined);
  assert.equal(loaded.role, 'member');
  assert.equal(loaded.parent.label, 'team-lead');
});

test('旧 instanceId 身份文件迁移为 peerId', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-id-'));
  const file = join(home, 'cow', 'instance.json');
  mkdirSync(join(home, 'cow'), { recursive: true });
  writeFileSync(file, JSON.stringify({ schema: 1, instanceId: 'cods_legacy01', uuid: 'u1', createdAt: new Date().toISOString() }), 'utf8');
  const identity = loadIdentity({ home });
  assert.equal(identity.peerId, 'cods_legacy01');
  assert.equal(identity.instanceId, undefined);
  const stored = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(stored.peerId, 'cods_legacy01');
  assert.equal(stored.instanceId, undefined);
});
