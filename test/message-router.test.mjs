import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageRouter } from '../src/message-router.js';

test('complete/ask 注入原会话，answer 回子端', () => {
  const injected = [];
  const sent = [];
  const router = new MessageRouter({
    channel: { send: (peer, frame) => { sent.push({ peer, frame }); return { delivered: true }; } },
    inject: (...args) => { injected.push(args); return true; },
    selfName: () => 'COW Dev',
    parentLabel: () => '更上级',
    parentId: () => 'cow_parent',
  });
  router.handle('F', { type: 'msg.complete', payload: { messageId: 'm1', replyTo: 'd1', session: { id: 's1' }, text: 'done' } });
  router.handle('F', { type: 'msg.ask', payload: { messageId: 'm2', questionId: 'q1', session: { id: 's1' }, text: 'ok?', options: ['允许一次'] } });
  assert.equal(injected.length, 2);
  assert.equal(injected[0][0], 's1');
  assert.equal(injected[0][3], 'complete');
  assert.match(injected[0][2], /done/);
  assert.equal(injected[1][3], 'ask');
  assert.match(injected[1][2], /replyTo="q1"/);
  // 询问交给被询问节点的 Agent 处理：本机思考 / 原生 UI / 请示上级，而不是留在设置页。
  assert.match(injected[1][2], /ask_user_question/);
  assert.match(injected[1][2], /COW Dev/);
  assert.match(injected[1][2], /cow_send\(peerId="cow_parent", kind="ask"/);
  assert.doesNotMatch(injected[1][2], /设置页处理/);
  assert.doesNotMatch(injected[1][2], /peer="更上级"/);
  assert.equal(router.pending().length, 1);
  router.answer('q1', '允许一次');
  assert.equal(sent[0].peer, 'F');
  assert.equal(sent[0].frame.type, 'msg.answer');
  assert.equal(sent[0].frame.payload.text, '允许一次');
  assert.equal(router.pending().length, 0);
});

test('重复送达的 complete 只注入一次', () => {
  const injected = [];
  const router = new MessageRouter({ channel: { send() {} }, inject: (...args) => injected.push(args) });
  const frame = { type: 'msg.complete', payload: { messageId: 'm1', session: { id: 's1' }, text: 'done' } };
  router.handle('F', frame);
  router.handle('F', frame);
  assert.equal(injected.length, 1);
});

test('ask.cancel 或 TTL 会清理待处理询问', () => {
  const router = new MessageRouter({ channel: { send() {} }, inject() {}, questionTtlMs: 1 });
  router.handle('F', { type: 'msg.ask', payload: { messageId: 'm1', questionId: 'q1', session: { id: 's1' }, text: 'ok?' } });
  assert.equal(router.pending().length, 1);
  router.handle('F', { type: 'msg.ask.cancel', payload: { questionId: 'q1' } });
  assert.equal(router.pending().length, 0);
  router.handle('F', { type: 'msg.ask', payload: { messageId: 'm2', questionId: 'q2', session: { id: 's1' }, text: 'ok?' } });
  return new Promise((resolve) => setTimeout(() => {
    assert.equal(router.pending().length, 0, '超过 TTL 的询问自动清理');
    resolve();
  }, 10));
});

test('回答不存在的询问会报错', () => {
  const router = new MessageRouter({ channel: { send() {} }, inject() {} });
  assert.throws(() => router.answer('q_missing', 'x'), /没有找到/);
});
