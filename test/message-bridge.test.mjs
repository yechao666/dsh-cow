import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageBridge } from '../src/message-bridge.js';

function fakeEnv(id = 'w1', seq = 1) {
  return { kind: 'dispatch', messageId: `m_${id}_${seq}`, peerName: 'F', text: 'hello', workspace: { id, name: 'A', path: '/a' }, session: { id: 's1', title: 'T' }, approvalMode: 'follow' };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

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
  await tick();
  assert.equal(sent[0].frame.type, 'msg.complete');
  assert.equal(sent[0].frame.payload.replyTo, 'm_w1_1');
  assert.equal(sent[0].frame.payload.text, 'done');
});

test('同一工作区复用子会话，不同工作区分开', async () => {
  const agents = { get: () => null, create: async ({ sessionId }) => ({ agent: { session: { seq: 0 }, followup() {}, whenIdle: async () => {} }, sessionId }) };
  const bridge = new MessageBridge({ channel: { send() {} }, agents, summarize: () => '', workspacePath: (ws) => ws.id });
  const a = await bridge.dispatch(fakeEnv('w1', 1), '主 DSH');
  // 不同主会话、同一工作区：复用同一子会话。
  const b = await bridge.dispatch({ ...fakeEnv('w1', 2), session: { id: 's2' } }, '主 DSH');
  const c = await bridge.dispatch(fakeEnv('w2', 3), '主 DSH');
  assert.equal(a.sessionId, b.sessionId);
  assert.notEqual(a.sessionId, c.sessionId);
});

test('同一子会话处理多个主会话时，complete 回到各自原会话', async () => {
  const sent = [];
  const agent = { session: { seq: 0, eventAt: () => undefined }, followup(message) { agent.session.seq += 1; }, whenIdle: async () => {} };
  const bridge = new MessageBridge({
    channel: { send: (peer, frame) => sent.push({ peer, frame }) },
    agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) },
    summarize: () => 'done',
    workspacePath: (ws) => ws.id,
  });
  const a = await bridge.dispatch({ ...fakeEnv('w1', 1), session: { id: 'main-A' } }, '主 DSH');
  const b = await bridge.dispatch({ ...fakeEnv('w1', 2), session: { id: 'main-B' } }, '主 DSH');
  assert.equal(a.sessionId, b.sessionId);
  await tick();
  const completes = sent.filter((item) => item.frame.type === 'msg.complete');
  assert.equal(completes.length, 2);
  assert.deepEqual(completes.map((item) => item.frame.payload.session.id).sort(), ['main-A', 'main-B']);
  assert.deepEqual(completes.map((item) => item.frame.payload.replyTo).sort(), ['m_w1_1', 'm_w1_2']);
});

test('进程重启后按工作区键 resume 已存在的子会话', async () => {
  let created = 0;
  let resumed = 0;
  const agent = { session: { seq: 0 }, followup() {}, whenIdle: async () => {} };
  const bridge = new MessageBridge({
    channel: { send() {} },
    agents: {
      get: () => null,
      resume: async ({ resumeSessionId }) => { resumed += 1; return { sessionId: resumeSessionId, agent }; },
      create: async ({ sessionId }) => { created += 1; return { sessionId, agent }; },
    },
    summarize: () => '',
    workspacePath: (ws) => ws.id,
  });
  await bridge.dispatch(fakeEnv('w1', 1), '主 DSH');
  assert.equal(resumed, 1);
  assert.equal(created, 0);
});

test('answer 注入同一子会话', async () => {
  const input = [];
  const agent = { session: { seq: 0 }, followup: (m) => input.push(m), whenIdle: async () => {} };
  const bridge = new MessageBridge({ channel: { send() {} }, agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) }, workspacePath: (w) => w.id });
  const envelope = { ...fakeEnv('w1'), kind: 'answer', messageId: 'r1', peerName: 'F', text: '允许一次' };
  const result = await bridge.answer(envelope, 'F');
  assert.equal(result.status, 'sent');
  assert.equal(input.length, 1);
  assert.match(input[0].content[0].text, /允许一次/);
});

test('ask 只发消息不建任务，answer 兑现等待中的提问', async () => {
  const frames = [];
  const agent = { session: { seq: 0 }, followup() {}, whenIdle: async () => {} };
  const bridge = new MessageBridge({
    channel: { send: (peer, frame) => { frames.push({ peer, frame }); return { delivered: true }; } },
    agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) },
    workspacePath: (w) => w.id,
  });
  const dispatch = await bridge.dispatch(fakeEnv('w1', 9), '主 DSH');
  const pending = bridge.ask({ sessionId: dispatch.sessionId, question: '要 A 还是 B？', options: ['A', 'B'], timeoutSec: 30 });
  const ask = frames.find((item) => item.frame.type === 'msg.ask');
  assert.ok(ask, '应该发出 msg.ask');
  assert.equal(ask.frame.payload.options[0], 'A');
  assert.equal(ask.frame.payload.session.id, 's1');
  await bridge.handleAnswer({ ...ask.frame.payload, kind: 'answer', replyTo: ask.frame.payload.questionId, text: 'A' }, '主 DSH');
  const result = await pending;
  assert.equal(result.ok, true);
  assert.equal(result.answer, 'A');
});

test('重复 messageId 不重复执行', async () => {
  const input = [];
  const agent = { session: { seq: 0 }, followup: (m) => input.push(m), whenIdle: async () => {} };
  const bridge = new MessageBridge({ channel: { send() {} }, agents: { get: () => null, create: async ({ sessionId }) => ({ sessionId, agent }) }, workspacePath: (w) => w.id });
  await bridge.dispatch(fakeEnv('w1', 1), '主 DSH');
  const again = await bridge.dispatch(fakeEnv('w1', 1), '主 DSH');
  assert.equal(again.status, 'duplicate');
  assert.equal(input.length, 1);
});
