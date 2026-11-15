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
      instance: { peerId: 'cow_self', displayName: 'self', version: '1.26.0', description: 'desc', role: 'leader' },
      channel: {
        connections: () => [],
        status: () => ({ state: 'offline' }),
        send: (peer, frame) => { sent.push({ peer, frame }); return { delivered: true }; },
      },
      peers: {
        list: () => [
          { label: '子 DSH-x', peerId: 'cow_child', relation: 'child' },
          { label: '主 DSH', peerId: 'cow_parent', relation: 'parent' },
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
  const result = await tool.execute({ peerId: 'cow_child', peerName: '子 DSH-x', message: '做一件事' }, { agent: { session: { id: 'session-1' } } });
  assert.equal(result.status, 'sent');
  assert.ok(result.messageId);
  assert.equal(result.peerId, 'cow_child');
  assert.equal(result.peerName, '子 DSH-x');
  assert.equal(sent[0].peer, 'cow_child', '按 peerId 路由，而不是显示名');
  assert.equal(sent[0].frame.type, 'msg.dispatch');
  assert.equal(sent[0].frame.payload.peerId, 'cow_child');
  assert.equal(sent[0].frame.payload.peerName, '子 DSH-x');
  assert.equal(sent[0].frame.payload.text, '做一件事');
  assert.equal(sent[0].frame.payload.session.id, 'session-1');
  assert.equal(sent[0].frame.payload.workspace.id, 'w1');
  assert.equal(sent[0].frame.payload.approvalMode, 'follow');
});

test('所有工具参数都不再用 peer，目标节点用 peerId/peerName', () => {
  const { defs } = deps({
    files: {
      sendPath: async () => ({ files: [], totalBytes: 0 }),
      requestFile: async () => ({}),
      pullDir: async () => ({}),
      cancel: () => ({}),
      stats: () => ({}),
    },
  });
  const targeted = new Set(['cow_send', 'cow_send_file', 'cow_receive_file', 'cow_pull_dir', 'cow_set_file_policy']);
  for (const tool of defs) {
    const props = tool.parameters?.properties ?? {};
    assert.equal(Object.prototype.hasOwnProperty.call(props, 'peer'), false, `${tool.name} 不应再有 peer 参数`);
    if (targeted.has(tool.name)) {
      assert.equal(Object.prototype.hasOwnProperty.call(props, 'peerId'), true, `${tool.name} 应有 peerId 参数`);
      assert.equal(Object.prototype.hasOwnProperty.call(props, 'peerName'), true, `${tool.name} 应有可选 peerName 参数`);
    }
  }
});

test('cow_send 只认 peerId；peerName 只用于核对', async () => {
  const { defs } = deps();
  const tool = find(defs, 'cow_send');
  await assert.rejects(tool.execute({ message: 'x' }, { agent: { session: { id: 's' } } }), /peerId/);
  await assert.rejects(tool.execute({ peerName: '不存在节点', message: 'x' }, { agent: { session: { id: 's' } } }), /未知节点 peerName/);
  // 名字随时可能改：传旧名字也不报错，按 peerId 路由，返回当前名字。
  const result = await tool.execute({ peerId: 'cow_child', peerName: '旧名字', message: 'x' }, { agent: { session: { id: 's' } } });
  assert.equal(result.peerId, 'cow_child');
  assert.equal(result.peerName, '子 DSH-x');
});

test('cow_send 不能派回上级', async () => {
  const { defs } = deps();
  const tool = find(defs, 'cow_send');
  await assert.rejects(tool.execute({ peerId: 'cow_parent', message: 'x' }, { agent: { session: { id: 's' } } }), /上级/);
});

test('cow_send kind=ask 走消息桥等待回答', async () => {
  const { defs, asked } = deps();
  const tool = find(defs, 'cow_send');
  const result = await tool.execute({ message: '要 A 吗？', kind: 'ask', options: ['A'] }, { agent: { session: { id: 'session-child' } } });
  assert.equal(result.ok, true);
  assert.equal(result.peerName, '主 DSH');
  assert.equal(result.peerId, 'cow_parent');
  assert.equal(asked[0].sessionId, 'session-child');
  assert.deepEqual(asked[0].options, ['A']);
});

test('cow_send 带 replyTo 时作为回答回到子会话', async () => {
  const { defs, answered } = deps();
  const tool = find(defs, 'cow_send');
  const result = await tool.execute({ peerId: 'cow_child', peerName: '子 DSH-x', message: '允许一次', replyTo: 'q1' }, { agent: { session: { id: 's' } } });
  assert.deepEqual(answered[0], { questionId: 'q1', text: '允许一次' });
  assert.equal(result.peerId, 'cow_child');
  assert.equal(result.peerName, '子 DSH-x');
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
  assert.deepEqual(await policy.execute({ peerId: 'cow_child', peerName: '子 DSH-x', allowFiles: false }, {}), { peerId: 'cow_child', peerName: '子 DSH-x', allowFiles: false, maxFileMB: undefined });
});

test('cow_upgrade 发送带下载地址的升级消息', async () => {
  const pack = {
    url: 'http://main:60001/cow/v1/plugin/package',
    sha256: 'a'.repeat(64),
    version: '1.31.0',
  };
  const { defs, sent } = deps({ packages: { issue: () => pack } });
  const tool = find(defs, 'cow_upgrade');
  assert.ok(tool);
  const result = await tool.execute({ peerId: 'cow_child' }, { agent: { session: { id: 's' } } });
  assert.equal(result.status, 'sent');
  assert.equal(result.version, '1.31.0');
  assert.equal(sent[0].frame.type, 'msg.upgrade');
  assert.equal(sent[0].frame.payload.package.version, '1.31.0');
  assert.equal(sent[0].frame.payload.package.url, pack.url);
  assert.equal(sent[0].frame.payload.package.sha256, pack.sha256);
  assert.equal(sent[0].frame.payload.package.action, 'install');
});

test('cow_upgrade 外部地址必须带 sha256 和 version', async () => {
  const { defs } = deps({ packages: { issue: () => { throw new Error('should not be used'); } } });
  const tool = find(defs, 'cow_upgrade');
  await assert.rejects(tool.execute({ peerId: 'cow_child', url: 'https://example.com/dsh-cow.tgz' }, { agent: { session: { id: 's' } } }), /sha256/);
  await assert.rejects(tool.execute({ peerId: 'cow_child', url: 'https://example.com/dsh-cow.tgz', sha256: 'b'.repeat(64) }, { agent: { session: { id: 's' } } }), /version/);
});
