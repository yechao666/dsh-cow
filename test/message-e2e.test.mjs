import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageBridge } from '../src/message-bridge.js';
import { MessageRouter } from '../src/message-router.js';

test('dispatch → 子会话 → complete → 原会话注入', async () => {
  const injected = [];
  const router = new MessageRouter({ channel: { send() {} }, inject: (...args) => injected.push(args) });
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
    kind: 'dispatch', messageId: 'm1', peer: 'F', text: '做一件事',
    workspace: { id: 'w1', name: 'A', path: '/a' },
    session: { id: 'main-s1', title: '主会话' },
    approvalMode: 'follow',
  };
  const sent = await bridge.dispatch(envelope, 'F');
  assert.equal(sent.status, 'sent');
  assert.equal(input.length, 1);
  assert.equal(injected.length, 1);
  assert.equal(injected[0][0], 'main-s1');
  assert.equal(injected[0][3], 'complete');
});
