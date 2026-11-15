import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageBridge } from '../src/message-bridge.js';
import { MessageRouter } from '../src/message-router.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('dispatch → 子会话 → complete → 原会话注入', async () => {
  const injected = [];
  const router = new MessageRouter({
    channel: { send: () => ({ delivered: true }) },
    inject: (...args) => injected.push(args),
  });
  const input = [];
  const agent = {
    session: { seq: 0 },
    followup(msg) { input.push(msg); agent.session.seq += 1; },
    async whenIdle() {},
  };
  const bridge = new MessageBridge({
    channel: { send: (peer, frame) => router.handle(peer, frame) },
    agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) },
    summarize: () => '任务完成',
    workspacePath: () => '/tmp/ws',
  });
  const envelope = {
    kind: 'dispatch', messageId: 'm1', peerName: 'F', peerId: 'cow_f', text: '做一件事',
    workspace: { id: 'w1', name: 'A', path: '/a' },
    session: { id: 'main-s1', title: '主会话' },
    approvalMode: 'follow',
  };
  const sent = await bridge.dispatch(envelope, 'F');
  assert.equal(sent.status, 'sent');
  assert.equal(input.length, 1);
  await tick();
  assert.equal(injected.length, 1);
  assert.equal(injected[0][0], 'main-s1');
  assert.equal(injected[0][3], 'complete');
});

test('ask → answer 往返同一 workspace+session', async () => {
  const sent = [];
  let bridge;
  const deliver = (peer, frame) => {
    sent.push({ peer, frame });
    if (frame.type === 'msg.ask') {
      router.handle(peer, frame);
      const pending = router.pending()[0];
      assert.ok(pending, '主端应缓存询问');
      router.answer(pending.questionId, 'A');
    }
    if (frame.type === 'msg.answer') bridge.handleAnswer(frame.payload, peer);
    return { delivered: true };
  };
  const router = new MessageRouter({ channel: { send: deliver }, inject() {} });
  const agent = {
    session: { seq: 0 },
    followup() { agent.session.seq += 1; },
    async whenIdle() {},
  };
  bridge = new MessageBridge({
    channel: { send: deliver },
    agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) },
    workspacePath: () => '/tmp/ws',
  });
  const dispatch = await bridge.dispatch({
    kind: 'dispatch', messageId: 'm1', peerName: 'F', peerId: 'cow_f', text: '开始',
    workspace: { id: 'w1', name: 'A', path: '/a' },
    session: { id: 'main-s1', title: '主会话' },
    approvalMode: 'follow',
  }, 'F');
  const result = await bridge.ask({ sessionId: dispatch.sessionId, question: '要 A 还是 B？', options: ['A', 'B'], timeoutSec: 10 });
  assert.equal(result.ok, true);
  assert.equal(result.answer, 'A');
  assert.ok(sent.some((item) => item.frame.type === 'msg.answer'));
  assert.equal(sent.find((item) => item.frame.type === 'msg.answer').frame.payload.session.id, 'main-s1');
});
