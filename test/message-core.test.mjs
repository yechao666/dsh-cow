import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEnvelope, childKey } from '../src/message-core.js';

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
