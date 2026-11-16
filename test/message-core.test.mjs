import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEnvelope, summarizeSession, summarizeTurn, workspaceKey } from '../src/message-core.js';

test('dispatch 信封完整', () => {
  const msg = buildEnvelope({ kind: 'dispatch', peerName: 'F', peerId: 'cow_f', text: 'hello', workspace: { id: 'w1', name: 'A', path: '/a' }, session: { id: 's1', title: 'T' }, approvalMode: 'follow' });
  assert.equal(msg.kind, 'dispatch');
  assert.equal(msg.peerId, 'cow_f');
  assert.equal(msg.peerName, 'F');
  assert.equal(msg.peer, msg.peerName, '兼容旧节点的只读别名');
  assert.equal(msg.workspace.id, 'w1');
  assert.equal(msg.session.id, 's1');
  assert.ok(msg.messageId);
});

test('complete 引用 dispatch', () => {
  const msg = buildEnvelope({ kind: 'complete', peerName: 'F', peerId: 'cow_f', text: 'done', workspace: { id: 'w1' }, session: { id: 's1' }, replyTo: 'msg1' });
  assert.equal(msg.replyTo, 'msg1');
  assert.equal(msg.peerId, 'cow_f');
  assert.equal(msg.peerName, 'F');
  assert.equal(msg.peer, msg.peerName, '兼容旧节点的只读别名');
});

test('workspaceKey 按 peerId + 工作区复用，不带主会话', () => {
  const key = workspaceKey({ peerId: 'cow_peer', peerName: '主 DSH', workspace: { id: 'w1', name: 'proj' } });
  assert.equal(key, 'cow_peer::w1');
  assert.equal(
    workspaceKey({ peerId: 'cow_peer', workspace: { id: 'w1' } }),
    workspaceKey({ peerId: 'cow_peer', workspace: { id: 'w1', name: 'renamed' } }),
  );
  // peerName 只作显示名，不参与复用键；旧节点的 peer 别名仍可回退。
  assert.throws(() => workspaceKey({ peerName: '主 DSH', workspace: { id: 'w1' } }), /peerId/);
  assert.equal(workspaceKey({ peer: 'legacy-peer', workspace: { id: 'w1' } }), 'legacy-peer::w1');
});

test('summarizeTurn 只取指定 messageId 那一轮', () => {
  const events = [
    { type: 'user/message', data: { id: 'm1', source: { kind: 'user' } } },
    { type: 'user/message', data: { id: 'ctx1', source: { kind: 'runtime-context' } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '第一轮' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
    { type: 'user/message', data: { id: 'm2', source: { kind: 'user' } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '第二轮' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'completed' } } },
  ];
  const session = { seq: events.length, eventAt: (seq) => events[seq] };
  assert.equal(summarizeTurn(session, 0, 'm1'), '第一轮');
  assert.equal(summarizeTurn(session, 0, 'm2'), '第二轮');
  assert.equal(summarizeTurn(session, 0, 'missing'), null);
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

test('nextChain：首次派发开新链，后续继承并递增', async () => {
  const { nextChain, buildEnvelope, completeEnvelope, DEFAULT_MAX_CHAIN_DEPTH } = await import('../src/message-core.js');
  const first = nextChain(null);
  assert.equal(first.depth, 1);
  assert.equal(first.maxDepth, DEFAULT_MAX_CHAIN_DEPTH);
  assert.ok(first.id);
  assert.equal(first.overLimit, false);

  const again = nextChain(first);
  assert.equal(again.id, first.id, '同一条链要复用 id');
  assert.equal(again.depth, 2);

  const capped = nextChain({ id: 'c1', depth: 3, maxDepth: 3 });
  assert.equal(capped.overLimit, true);
});

test('complete / ask 回执原样带回 chain，供上级继续计数', async () => {
  const { buildEnvelope, completeEnvelope, askEnvelope } = await import('../src/message-core.js');
  const dispatch = buildEnvelope({
    kind: 'dispatch', peerId: 'cow_child', peerName: '子', text: 'hi',
    workspace: { id: 'w', name: 'w', path: '/w' }, session: { id: 's', title: '' },
    chain: { id: 'chain-9', depth: 2, maxDepth: 3 },
  });
  assert.deepEqual(dispatch.chain, { id: 'chain-9', depth: 2, maxDepth: 3 });
  assert.deepEqual(completeEnvelope(dispatch, 'done').chain, dispatch.chain);
  assert.deepEqual(askEnvelope(dispatch, '要吗？').chain, dispatch.chain);
});
