import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DeadLetterStore } from '../src/dead-letter.js';

test('死信持久化、裁剪和统计', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-dl-'));
  const file = join(home, 'dead-letters.json');
  const store = new DeadLetterStore({ file, limit: 10 });
  store.add({ reason: 'expired', peer: 'A', messageId: 'm1', type: 'msg.dispatch' });
  store.add({ reason: 'queue_overflow', peer: 'B', messageId: 'm2', type: 'peer.message' });
  store.add({ reason: 'expired', peer: 'C', messageId: 'm3', type: 'msg.dispatch' });
  assert.deepEqual(store.stats(), { total: 3, limit: 10, expired: 2, overflow: 1 });
  assert.deepEqual(store.list(10).map((item) => item.messageId), ['m3', 'm2', 'm1']);
  const loaded = new DeadLetterStore({ file, limit: 10 });
  assert.equal(loaded.stats().total, 3);
  assert.ok(readFileSync(file, 'utf8').includes('m3'));
});
