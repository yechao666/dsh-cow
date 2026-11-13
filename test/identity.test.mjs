import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
  writeFileSync(file, JSON.stringify({ schema: 1, instanceId: 'cods_old000000000', createdAt: new Date().toISOString() }), 'utf8');
  const identity = loadIdentity({ home });
  assert.equal(identity.instanceId, 'cods_old000000000');
  assert.equal(identity.orgId, undefined);
  assert.equal(identity.role, 'leader');
  assert.equal(loadIdentity({ home }).role, 'leader');
});

test('加入上级后角色变为 member，parent 持久化', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-id-'));
  loadIdentity({ home });
  patchIdentity(home, {
    role: 'member',
    parent: { instanceId: 'cods_parent', label: 'team-lead', url: 'http://lead/cow/v1' },
  });
  const loaded = loadIdentity({ home });
  assert.equal(loaded.orgId, undefined);
  assert.equal(loaded.role, 'member');
  assert.equal(loaded.parent.label, 'team-lead');
});
