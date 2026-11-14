import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEnvelope, childKey, summarizeSession } from '../src/message-core.js';

test('消息必须带工作区与会话隔离键', () => {
  assert.throws(() => childKey({ peer: 'F', workspace: {}, session: { id: 's1' } }), /workspace/);
  assert.equal(childKey({ peer: 'F', workspace: { id: 'w1' }, session: { id: 's1' } }), 'F::w1::s1');
});

test('dispatch 信封完整', () => {
  const msg = buildEnvelope({ kind: 'dispatch', peer: 'F', text: 'hello', workspace: { id: 'w1', name: 'A', path: '/a' }, session: { id: 's1', title: 'T' }, approvalMode: 'follow' });
  assert.equal(msg.kind, 'dispatch');
  assert.equal(msg.workspace.id, 'w1');
  assert.equal(msg.session.id, 's1');
  assert.ok(msg.messageId);
});

test('complete 引用 dispatch', () => {
  const msg = buildEnvelope({ kind: 'complete', peer: 'F', text: 'done', workspace: { id: 'w1' }, session: { id: 's1' }, replyTo: 'msg1' });
  assert.equal(msg.replyTo, 'msg1');
});

test('summarizeSession 跳过水位前的旧消息并抽取本轮助手文本', () => {
  const events = [
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '旧结论' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
    { type: 'turn/start', data: { turn: 2 } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '新结论' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
  ];
  const session = { seq: events.length, eventAt: (seq) => events[seq] };
  assert.equal(summarizeSession(session, 3), '新结论');
  assert.equal(summarizeSession(session, 0), '新结论');
});

test('summarizeSession 在本轮 turn/end 报错时抛出（complete 会带失败原因）', () => {
  const events = [
    { type: 'turn/start', data: {} },
    { type: 'turn/end', data: { reason: { kind: 'error', error: { message: '目录不存在' } } } },
  ];
  const session = { seq: events.length, eventAt: (seq) => events[seq] };
  assert.throws(() => summarizeSession(session, 0), /目录不存在/);
});
