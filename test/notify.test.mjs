import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NotificationRouter, peerMessageText, taskNotificationText } from '../src/notify.js';
import { Inbox } from '../src/inbox.js';
import { RemoteTaskIndex } from '../src/remote-tasks.js';
import { PeerRegistry } from '../src/peers.js';

function makeRig({ config = {} } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'cow-notify-'));
  const inbox = new Inbox({ file: join(home, 'inbox.json') });
  const remoteIndex = new RemoteTaskIndex({ file: join(home, 'remote.json') });
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  const injected = [];
  const sessions = new Map([
    [
      'session-1',
      {
        session: { id: 'session-1' },
        followup(message) {
          injected.push(message);
        },
      },
    ],
  ]);
  const ctx = {
    get(name) {
      if (name !== 'agents') return undefined;
      return { get: (id) => sessions.get(id) };
    },
  };
  const cfg = { notifyMode: 'inject', maxInjectionsPerMinute: 3, ...config };
  const router = new NotificationRouter({ ctx, resolveConfig: () => cfg, peers, remoteIndex, inbox, logger: { info() {}, warn() {} } });
  return { router, inbox, remoteIndex, peers, injected, sessions, cfg };
}

function completeEvent(taskId, extra = {}, at = '') {
  return {
    msgId: `m-${taskId}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'task.completed',
    ...(at ? { at } : {}),
    payload: { taskId, status: 'succeeded', title: 'iOS 构建', summary: '结论：构建成功', needsInput: null, ...extra },
  };
}

test('任务完成后注入发起会话，且通知里带 taskId', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_1', { label: 'mac-mini', url: 'http://mac-mini/cow/v1' }, { originSessionId: 'session-1' });
  const outcome = router.handle({ from: 'mac-mini', event: completeEvent('task_1') });
  assert.equal(outcome.injected, true);
  assert.equal(injected.length, 1);
  const text = injected[0].content[0].text;
  assert.match(text, /任务「iOS 构建」/);
  assert.match(text, /cow_task/);
});

test('本地正在等待结果时不注入（避免和工具返回重复）', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_2', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  remoteIndex.markAwaited('task_2', true);
  const outcome = router.handle({ from: 'mac-mini', event: completeEvent('task_2') });
  assert.equal(outcome.injected, false);
  assert.equal(outcome.reason, 'awaited');
  assert.equal(injected.length, 0);
});

test('工具已拿到终态后不再注入', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_3', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  remoteIndex.markDelivered('task_3');
  const outcome = router.handle({ from: 'mac-mini', event: completeEvent('task_3') });
  assert.equal(outcome.reason, 'already_delivered');
  assert.equal(injected.length, 0);
});

test('不是本机派出的任务只进收件箱', () => {
  const { router, inbox } = makeRig();
  const outcome = router.handle({ from: 'other', event: completeEvent('task_unknown') });
  assert.equal(outcome.injected, false);
  assert.equal(outcome.reason, 'not_my_task');
  assert.equal(inbox.unreadCount(), 1);
});

test('需要人工确认的通知引导用 cow_send 答复', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_4', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  router.handle({
    from: 'mac-mini',
    event: completeEvent('task_4', { needsInput: { question: '用 release 证书还是 development？' } }),
  });
  assert.equal(injected.length, 1);
  assert.match(injected[0].content[0].text, /cow_send/);
  assert.match(injected[0].content[0].text, /release 证书还是 development/);
});

test('peer.message 默认只进收件箱，指定会话才注入', () => {
  const { router, inbox, injected } = makeRig();
  const first = router.handle({ from: 'mac-mini', event: { msgId: 'm1', type: 'peer.message', payload: { message: '任务已交接' } } });
  assert.equal(first.injected, false);
  assert.equal(inbox.unreadCount(), 1);

  const second = router.handle({
    from: 'mac-mini',
    event: { msgId: 'm2', type: 'peer.message', payload: { message: '请看下这个', targetSessionId: 'session-1' } },
  });
  assert.equal(second.injected, true);
  assert.match(injected[0].content[0].text, /不可信数据/);
});

test('同一会话注入有频率上限', () => {
  const { router, remoteIndex, injected, peers } = makeRig({ config: { maxInjectionsPerMinute: 2 } });
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  for (const id of ['a', 'b', 'c']) {
    remoteIndex.remember(`task_${id}`, { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
    router.handle({ from: 'mac-mini', event: completeEvent(`task_${id}`) });
  }
  assert.equal(injected.length, 2);
});

test('会被注入的会话不存在时落回收件箱', () => {
  const { router, remoteIndex, inbox, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_dead', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-gone' });
  const outcome = router.handle({ from: 'mac-mini', event: completeEvent('task_dead') });
  assert.equal(outcome.injected, false);
  assert.equal(outcome.reason, 'session_not_live');
  assert.equal(inbox.unreadCount(), 1);
});

test('notifyMode=inbox 时从不注入', () => {
  const { router, remoteIndex, injected, peers } = makeRig({ config: { notifyMode: 'inbox' } });
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_5', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  const outcome = router.handle({ from: 'mac-mini', event: completeEvent('task_5') });
  assert.equal(outcome.injected, false);
  assert.equal(injected.length, 0);
});

test('通知里带事件时间，方便判断是否过期', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_stamp', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  router.handle({ from: 'mac-mini', event: completeEvent('task_stamp', {}, '2026-11-11T03:29:04.000Z') });
  assert.equal(injected.length, 1);
  assert.match(injected[0].content[0].text, /事件时间 2026-11-11T03:29:04\.000Z/);
  assert.match(injected[0].content[0].text, /以最新一条为准/);
});

test('乱序到达的旧事件只入收件箱，不再注入', () => {
  const { router, remoteIndex, injected, peers } = makeRig();
  peers.upsert({ url: 'http://mac-mini/cow/v1', token: 'cods_abcdefghijklmnopqrst', label: 'mac-mini' });
  remoteIndex.remember('task_order', { label: 'mac-mini', url: 'x' }, { originSessionId: 'session-1' });
  const fresh = router.handle({ from: 'mac-mini', event: completeEvent('task_order', {}, '2026-11-11T03:30:03.000Z') });
  assert.equal(fresh.injected, true);
  const stale = router.handle({ from: 'mac-mini', event: completeEvent('task_order', {}, '2026-11-11T03:29:04.000Z') });
  assert.equal(stale.injected, false);
  assert.equal(stale.reason, 'stale_event');
  assert.equal(injected.length, 1);
});

test('通知文案区分失败与成功', () => {
  const failed = taskNotificationText({ from: 'mac-mini', task: { taskId: 't', status: 'failed', error: { message: '模型超时' } } });
  assert.match(failed, /执行失败/);
  assert.match(failed, /模型超时/);
  const message = peerMessageText({ from: 'mac-mini', message: 'hi' });
  assert.match(message, /不可信数据/);
});
