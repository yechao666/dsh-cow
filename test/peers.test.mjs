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
