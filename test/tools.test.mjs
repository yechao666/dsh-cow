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
  assert.deepEqual(names, ['cow_set_file_policy', 'cow_status', 'cow_peers', 'cow_send']);
});

test.skip('cow_delegate 已移除', () => {});




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
