import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageBridge } from '../src/message-bridge.js';

function fakeEnv(id = 'w1') {
  return { kind: 'dispatch', messageId: `m_${id}`, peer: 'F', text: 'hello', workspace: { id, name: 'A', path: '/a' }, session: { id: 's1', title: 'T' }, approvalMode: 'follow' };
}

test('dispatch 进入固定子会话并自动 complete', async () => {
  const sent = [];
  const input = [];
  const session = { seq: 0 };
  const agent = {
    session,
    followup(message) { input.push(message); session.seq += 1; },
    async whenIdle() {},
  };
  const agents = { get: () => null, create: async ({ sessionId }) => ({ agent, sessionId }) };
  const bridge = new MessageBridge({ channel: { send: (peer, frame) => sent.push({ peer, frame }) }, agents, summarize: () => 'done', workspacePath: (ws) => `/root/${ws.name}` });
  const result = await bridge.dispatch(fakeEnv(), '主 DSH');
  assert.equal(result.status, 'sent');
  assert.equal(input.length, 1);
  assert.equal(sent[0].frame.type, 'msg.complete');
  assert.equal(sent[0].frame.payload.replyTo, 'm_w1');
  assert.equal(sent[0].frame.payload.text, 'done');
});

test('同一工作区+会话复用子会话，不同会话分开', async () => {
  const agents = { get: () => null, create: async ({ sessionId }) => ({ agent: { session: { seq: 0 }, followup() {}, whenIdle: async () => {} }, sessionId }) };
  const bridge = new MessageBridge({ channel: { send() {} }, agents, summarize: () => '', workspacePath: (ws) => ws.id });
  const a = await bridge.dispatch(fakeEnv('w1'), '主 DSH');
  const b = await bridge.dispatch(fakeEnv('w1'), '主 DSH');
  const c = await bridge.dispatch({ ...fakeEnv('w1'), session: { id: 's2' } }, '主 DSH');
  assert.equal(a.sessionId, b.sessionId);
  assert.notEqual(a.sessionId, c.sessionId);
});

test('answer 注入同一子会话', async () => {
  const input = [];
  const agent = { session: { seq: 0 }, followup: (m) => input.push(m), whenIdle: async () => {} };
  const bridge = new MessageBridge({ channel: { send() {} }, agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) }, workspacePath: (w) => w.id });
  const envelope = { ...fakeEnv('w1'), kind: 'answer', messageId: 'r1', text: '允许一次' };
  const result = await bridge.answer(envelope, 'F');
  assert.equal(result.status, 'sent');
  assert.equal(input.length, 1);
  assert.match(input[0].content[0].text, /允许一次/);
});
