import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolDefinitions } from '../src/tools.js';

function deps(overrides = {}) {
  const sent = [];
  const answered = [];
  const asked = [];
  return {
    sent,
    answered,
    asked,
    defs: createToolDefinitions({
      instance: { instanceId: 'cow_self', displayName: 'self', version: '1.26.0', description: 'desc', role: 'leader' },
      channel: {
        connections: () => [],
        status: () => ({ state: 'offline' }),
        send: (peer, frame) => { sent.push({ peer, frame }); return { delivered: true }; },
      },
      peers: {
        list: () => [
          { label: '子 DSH-x', instanceId: 'cow_child', relation: 'child' },
          { label: '主 DSH', instanceId: 'cow_parent', relation: 'parent' },
        ],
        get: (label) => ({ label, relation: 'child', allowFiles: true }),
        upsert: (input) => ({ peer: input }),
      },
      files: null,
      doctor: () => ({ path: '/tmp/doctor.json', report: { generatedAt: 'x', instance: {}, channel: {}, files: null, activity: [] } }),
      bridge: {
        ask: async (input) => { asked.push(input); return { ok: true, answer: 'A', questionId: 'q1' }; },
      },
      router: {
        answer: (questionId, text) => { answered.push({ questionId, text }); return { questionId, status: 'sent' }; },
        pending: () => [],
      },
      sessionInfoFor: () => ({
        session: { id: 'session-1', title: '主会话' },
        workspace: { id: 'w1', name: 'proj', path: '/work/proj' },
      }),
      ...overrides,
    }),
  };
}

const find = (defs, name) => defs.find((tool) => tool.name === name);

test('工具清单只有消息与文件工具，没有任务工具', () => {
  const { defs } = deps();
  const names = defs.map((tool) => tool.name).sort();
  assert.deepEqual(names, ['cow_doctor', 'cow_peers', 'cow_send', 'cow_set_file_policy', 'cow_status']);
  assert.equal(find(defs, 'cow_delegate'), undefined);
  assert.equal(find(defs, 'cow_task'), undefined);
  assert.equal(find(defs, 'cow_cancel'), undefined);
  assert.equal(find(defs, 'cow_claim'), undefined);
  assert.equal(find(defs, 'cow_retry'), undefined);
  assert.equal(find(defs, 'cow_answer'), undefined);
});

test('cow_send 默认派 dispatch，立即返回消息 ID，不等待', async () => {
  const { defs, sent } = deps();
  const tool = find(defs, 'cow_send');
  const result = await tool.execute({ peer: '子 DSH-x', message: '做一件事' }, { agent: { session: { id: 'session-1' } } });
  assert.equal(result.status, 'sent');
  assert.ok(result.messageId);
  assert.equal(sent[0].peer, '子 DSH-x');
  assert.equal(sent[0].frame.type, 'msg.dispatch');
  assert.equal(sent[0].frame.payload.text, '做一件事');
  assert.equal(sent[0].frame.payload.session.id, 'session-1');
  assert.equal(sent[0].frame.payload.workspace.id, 'w1');
  assert.equal(sent[0].frame.payload.approvalMode, 'follow');
});

test('cow_send 不能派回上级', async () => {
  const { defs } = deps();
  const tool = find(defs, 'cow_send');
  await assert.rejects(tool.execute({ peer: '主 DSH', message: 'x' }, { agent: { session: { id: 's' } } }), /上级/);
});

test('cow_send kind=ask 走消息桥等待回答', async () => {
  const { defs, asked } = deps();
  const tool = find(defs, 'cow_send');
  const result = await tool.execute({ peer: '主 DSH', message: '要 A 吗？', kind: 'ask', options: ['A'] }, { agent: { session: { id: 'session-child' } } });
  assert.equal(result.ok, true);
  assert.equal(asked[0].sessionId, 'session-child');
  assert.deepEqual(asked[0].options, ['A']);
});

test('cow_send 带 replyTo 时作为回答回到子会话', async () => {
  const { defs, answered } = deps();
  const tool = find(defs, 'cow_send');
  await tool.execute({ peer: '子 DSH-x', message: '允许一次', replyTo: 'q1' }, { agent: { session: { id: 's' } } });
  assert.deepEqual(answered[0], { questionId: 'q1', text: '允许一次' });
});

test('cow_status 不再包含任务字段', async () => {
  const { defs } = deps();
  const status = await find(defs, 'cow_status').execute({}, {});
  assert.equal(status.tasks, undefined);
  assert.equal(status.currentInboundTask, undefined);
  assert.deepEqual(status.pendingAsks, []);
});

test('文件工具在 files 可用时注册，且只有直接下级可设策略', async () => {
  const { defs } = deps({
    files: {
      sendPath: async () => ({ files: [], totalBytes: 0 }),
      requestFile: async () => ({}),
      pullDir: async () => ({}),
      cancel: () => ({}),
      stats: () => ({}),
    },
  });
  const names = defs.map((tool) => tool.name);
  assert.ok(names.includes('cow_send_file'));
  assert.ok(names.includes('cow_receive_file'));
  const policy = find(defs, 'cow_set_file_policy');
  assert.deepEqual(await policy.execute({ peer: '子 DSH-x', allowFiles: false }, {}), { peer: '子 DSH-x', allowFiles: false, maxFileMB: undefined });
});
