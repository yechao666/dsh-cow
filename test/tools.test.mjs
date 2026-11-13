import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolDefinitions } from '../src/tools.js';

const deps = {
  instance: { instanceId: 'cow_self', displayName: 'self', version: '1.0.0', description: 'desc', role: 'leader' },
  channel: { connections: () => [], status: () => ({ state: 'offline' }), send: () => ({ delivered: false }) },
  peers: { list: () => [{ label: '子 DSH-x', instanceId: 'cow_child', relation: 'child' }] },
  tasks: { list: () => [], assign: () => ({}), get: () => null, snapshot: () => ({}), cancel: () => ({}) },
  currentInbound: () => null,
};

test('工具清单：status/peers/delegate/task/cancel/notify', () => {
  const names = createToolDefinitions(deps).map((tool) => tool.name);
  assert.deepEqual(names, ['cow_set_file_policy', 'cow_answer', 'cow_status', 'cow_peers', 'cow_delegate', 'cow_task', 'cow_cancel', 'cow_notify', 'cow_retry']);
});

test('cow_delegate 拒绝未知节点与上级；离线节点交给队列', async () => {
  const queued = [];
  const tools = createToolDefinitions({
    ...deps,
    peers: { list: () => [
      { label: '子 DSH-x', instanceId: 'cow_child', relation: 'child' },
      { label: '主 DSH', instanceId: 'cow_parent', relation: 'parent' },
    ] },
    tasks: { ...deps.tasks, assign: (input) => { queued.push(input); return { taskId: 't1', status: 'queued' }; } },
  });
  const delegate = tools.find((tool) => tool.name === 'cow_delegate');
  await assert.rejects(() => delegate.execute({ peer: '不存在', prompt: 'hello' }), /未知节点/);
  await assert.rejects(() => delegate.execute({ peer: '主 DSH', prompt: 'hello' }), /不能把任务派回上级/);
  const result = await delegate.execute({ peer: '子 DSH-x', prompt: 'hello' });
  assert.equal(result.status, 'queued');
  assert.equal(queued.length, 1);
});



test('cow_status 返回节点信息与连接数', async () => {
  const tools = createToolDefinitions(deps);
  const statusTool = tools.find((tool) => tool.name === 'cow_status');
  const result = await statusTool.execute({});
  assert.equal(result.instanceId, 'cow_self');
  assert.equal(result.version, '1.0.0');
  assert.equal(result.connections, 0);
  assert.equal(typeof result.diagnostics.installedVersion, 'string');
  assert.equal(result.diagnostics.files, null);
});
