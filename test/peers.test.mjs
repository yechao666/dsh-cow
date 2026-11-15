import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { peersPath } from '../src/peers.js';
import { PeerRegistry } from '../src/peers.js';

test('多个子节点（url 均为空）分别登记，不会互相覆盖', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  registry.upsert({ url: '', token: '', label: '本机-子DSH-A', peerId: 'cow_aaa', uuid: 'uuid-a', relation: 'child' });
  registry.upsert({ url: '', token: '', label: '本机-子DSH-B', peerId: 'cow_bbb', uuid: 'uuid-b', relation: 'child' });
  const children = registry.list().filter((peer) => peer.relation === 'child');
  assert.equal(children.length, 2);
  assert.deepEqual(children.map((peer) => peer.peerId).sort(), ['cow_aaa', 'cow_bbb']);
});

test('同名不同实例不会互相覆盖，显示名自动加实例后缀', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  const first = registry.upsert({ url: '', token: '', label: '子 DSH', peerId: 'cow_aaaaaa', relation: 'child' });
  const second = registry.upsert({ url: '', token: '', label: '子 DSH', peerId: 'cow_bbbbbb', relation: 'child' });
  assert.equal(first.peer.label, '子 DSH');
  assert.notEqual(second.peer.label, '子 DSH');
  assert.match(second.peer.label, /^子 DSH-/);
  assert.equal(registry.list().length, 2);
  // 同一实例改名仍然只更新一条。
  registry.upsert({ url: '', token: '', label: '新名字', peerId: 'cow_aaaaaa', relation: 'child' });
  assert.equal(registry.list().length, 2);
  assert.equal(registry.get('cow_aaaaaa').label, '新名字');
});

test('重新加载 peers.json 时不同实例的同名记录都保留', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const file = join(home, 'peers.json');
  const registry = new PeerRegistry({ file });
  registry.upsert({ url: '', token: '', label: '子 DSH', peerId: 'cow_aaaaaa', relation: 'child' });
  registry.upsert({ url: '', token: '', label: '子 DSH', peerId: 'cow_bbbbbb', relation: 'child' });
  const reloaded = new PeerRegistry({ file });
  assert.equal(reloaded.list().length, 2);
});

test('旧 peers.json 的 instanceId 迁移为 peerId', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-peers-'));
  const file = peersPath(home);
  mkdirSync(join(home, 'cow'), { recursive: true });
  writeFileSync(file, JSON.stringify({
    schema: 1,
    peers: [{ id: 'peer_1', label: '子 DSH', url: '', instanceId: 'cow_legacy', relation: 'child', addedAt: '2026-01-01T00:00:00.000Z' }],
  }), 'utf8');
  const registry = new PeerRegistry({ file });
  const [peer] = registry.list();
  assert.equal(peer.peerId, 'cow_legacy');
  assert.equal(peer.instanceId, undefined);
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(saved.peers[0].peerId, 'cow_legacy');
  assert.equal(saved.peers[0].instanceId, undefined);
});
