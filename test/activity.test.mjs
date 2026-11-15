import assert from 'node:assert/strict';
import test from 'node:test';
import { ActivityLog } from '../src/activity.js';

test('活动流按时间倒序保留最近 N 条', () => {
  let now = 1000;
  const log = new ActivityLog({ limit: 3, now: () => now });
  log.add({ kind: 'peer', text: '节点上线' });
  now += 1000;
  log.add({ kind: 'message', text: '派发消息', peerName: 'B', from: 'A', to: 'B', messageId: 'm1' });
  now += 1000;
  log.add({ kind: 'result', text: '消息完成', status: 'succeeded' });
  now += 1000;
  log.add({ kind: 'file', text: '发送文件' });
  const items = log.list(10);
  assert.equal(items.length, 3);
  assert.equal(items[0].kind, 'file');
  assert.equal(items[2].kind, 'message');
  assert.match(items[1].at, /^\d{4}-/);
  assert.equal(items[2].messageId, 'm1');
  assert.equal(items[2].from, 'A');
  assert.equal(items[2].to, 'B');
});
