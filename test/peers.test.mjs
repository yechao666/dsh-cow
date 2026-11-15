import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PeerRegistry } from '../src/peers.js';

test('多个子节点（url 均为空）分别登记，不会互相覆盖', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  registry.upsert({ url: '', token: '', label: '本机-子DSH-A', instanceId: 'cow_aaa', uuid: 'uuid-a', relation: 'child' });
  registry.upsert({ url: '', token: '', label: '本机-子DSH-B', instanceId: 'cow_bbb', uuid: 'uuid-b', relation: 'child' });
  const children = registry.list().filter((peer) => peer.relation === 'child');
  assert.equal(children.length, 2);
  assert.deepEqual(children.map((peer) => peer.instanceId).sort(), ['cow_aaa', 'cow_bbb']);
});

test('同名不同实例不会互相覆盖，显示名自动加实例后缀', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  const first = registry.upsert({ url: '', token: '', label: '子 DSH', instanceId: 'cow_aaaaaa', relation: 'child' });
  const second = registry.upsert({ url: '', token: '', label: '子 DSH', instanceId: 'cow_bbbbbb', relation: 'child' });
  assert.equal(first.peer.label, '子 DSH');
  assert.notEqual(second.peer.label, '子 DSH');
  assert.match(second.peer.label, /^子 DSH-/);
  assert.equal(registry.list().length, 2);
  // 同一实例改名仍然只更新一条。
  registry.upsert({ url: '', token: '', label: '新名字', instanceId: 'cow_aaaaaa', relation: 'child' });
  assert.equal(registry.list().length, 2);
  assert.equal(registry.get('cow_aaaaaa').label, '新名字');
});

test('重新加载 peers.json 时不同实例的同名记录都保留', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const file = join(home, 'peers.json');
  const registry = new PeerRegistry({ file });
  registry.upsert({ url: '', token: '', label: '子 DSH', instanceId: 'cow_aaaaaa', relation: 'child' });
  registry.upsert({ url: '', token: '', label: '子 DSH', instanceId: 'cow_bbbbbb', relation: 'child' });
  const reloaded = new PeerRegistry({ file });
  assert.equal(reloaded.list().length, 2);
});
