import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HaosTransport } from '../src/haos-transport.js';

function makeTransport({ handler, apiKey = 'haos_api_test' } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'cow-haos-'));
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const path = new URL(url).pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ path, method: init.method ?? 'GET', body, auth: init.headers?.authorization });
    const result = handler(path, { method: init.method ?? 'GET', body, auth: init.headers?.authorization }) ?? {};
    const status = result.__status ?? 200;
    const payload = result.__body ?? result;
    return new Response(JSON.stringify(payload), { status });
  };
  const transport = new HaosTransport({
    baseUrl: 'http://haos.test',
    apiKey,
    home,
    logger: { info() {}, warn() {}, error() {} },
    displayName: () => 'team-lead',
    capabilities: () => [{ id: 'role.coordinator', available: true }],
    onTask: () => {},
    fetchImpl,
  });
  return { transport, calls, home };
}

const ROUTES = {
  register: (body) => ({ instanceId: 'ins_lead', instanceToken: 'tok_lead', instanceName: 'dsh-0001' }),
  instance: () => ({ instance: { id: 'ins_lead' }, capabilities: ['role.coordinator'] }),
  heartbeat: () => ({ ok: true }),
  org: () => ({
    org: { id: 'org_1', maxDepth: 3, rootInstanceId: 'ins_lead' },
    members: [
      { instanceId: 'ins_lead', name: 'team-lead', depth: 0, parentInstanceId: null, status: 'online', capabilities: ['role.coordinator'] },
      { instanceId: 'ins_q', name: 'qa-runner', depth: 1, parentInstanceId: 'ins_lead', status: 'online', capabilities: ['role.qa'] },
    ],
  }),
  createTask: () => ({ taskId: 'relay_1', status: 'queued', chain: ['ins_lead'], depth: 1 }),
  getTask: () => ({ taskId: 'relay_1', status: 'succeeded', summary: 'ok', chain: ['ins_lead'], depth: 1 }),
  pending: () => ({ tasks: [{ taskId: 'relay_2', status: 'queued', prompt: 'p', chain: ['ins_x'], depth: 1 }] }),
  claim: () => ({ taskId: 'relay_2', status: 'running', prompt: 'p', chain: ['ins_x'], depth: 1 }),
  result: () => ({ taskId: 'relay_2', status: 'succeeded' }),
};

function route(path) {
  if (path.endsWith('/register')) return ROUTES.register();
  if (path.endsWith('/instance')) return ROUTES.instance();
  if (path.endsWith('/heartbeat')) return ROUTES.heartbeat();
  if (path.endsWith('/org')) return ROUTES.org();
  if (path.endsWith('/tasks/pending')) return ROUTES.pending();
  if (path.endsWith('/claim')) return ROUTES.claim();
  if (path.endsWith('/result')) return ROUTES.result();
  if (path.endsWith('/tasks')) return ROUTES.createTask();
  if (path.includes('/tasks/')) return ROUTES.getTask();
  return {};
}

test('注册到 Haos 并持久化实例令牌', async () => {
  const { transport, calls, home } = makeTransport({ handler: route });
  await transport.start();
  transport.stop();
  assert.equal(transport.state.instanceId, 'ins_lead');
  assert.equal(transport.state.instanceToken, 'tok_lead');
  const saved = JSON.parse((await import('node:fs')).readFileSync(join(home, 'cow', 'haos.json'), 'utf8'));
  assert.equal(saved.instanceToken, 'tok_lead');
  assert.equal(calls.some((call) => call.path.endsWith('/register')), true);
  assert.equal(calls.some((call) => call.path.endsWith('/heartbeat')), true);
  const registered = calls.find((call) => call.path.endsWith('/register'));
  assert.equal(registered.auth, undefined, '注册用 API Key 而不是实例令牌');
  assert.deepEqual(registered.body.capabilities, ['role.coordinator']);
});

test('从 Haos 读组织树，区分自己与下级', async () => {
  const { transport } = makeTransport({ handler: route });
  await transport.start();
  transport.stop();
  const view = await transport.org({ force: true });
  assert.equal(view.org.id, 'org_1');
  assert.equal(transport.selfMember(view)?.name, 'team-lead');
  const members = await transport.members();
  assert.deepEqual(members.map((member) => member.name), ['qa-runner']);
});

test('派任务给下级：提交到 Haos 并轮询到终态', async () => {
  const { transport } = makeTransport({ handler: route });
  await transport.start();
  transport.stop();
  const created = await transport.createTask({ targetInstanceId: 'ins_q', prompt: '跑测试' });
  assert.equal(created.taskId, 'relay_1');
  const done = await transport.wait('relay_1', 5_000);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.summary, 'ok');
});

test('轮询 pending 任务并领取后交给执行器', async () => {
  const handled = [];
  const pendingList = [{ taskId: 'relay_2', status: 'queued', prompt: 'p', chain: ['ins_x'], depth: 1 }];
  const home = mkdtempSync(join(tmpdir(), 'cow-haos-'));
  const transport = new HaosTransport({
    baseUrl: 'http://haos.test',
    apiKey: 'haos_api_test',
    home,
    logger: { info() {}, warn() {}, error() {} },
    displayName: () => 'qa-runner',
    capabilities: () => [],
    onTask: async (task) => handled.push(task),
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      if (path.endsWith('/register')) return new Response(JSON.stringify({ instanceId: 'ins_q', instanceToken: 'tok_q' }), { status: 200 });
      if (path.endsWith('/instance')) return new Response(JSON.stringify({ instance: { id: 'ins_q' } }), { status: 200 });
      if (path.endsWith('/heartbeat')) return new Response(JSON.stringify({ ok: true }), { status: 200 });
      if (path.endsWith('/tasks/pending')) return new Response(JSON.stringify({ tasks: pendingList.slice() }), { status: 200 });
      if (path.endsWith('/claim')) {
        const claimed = pendingList.shift();
        return new Response(JSON.stringify({ ...claimed, status: 'running' }), { status: 200 });
      }
      return new Response(JSON.stringify({}), { status: 200 });
    },
  });
  await transport.start();
  for (let i = 0; i < 20 && handled.length === 0; i += 1) await new Promise((resolve) => setTimeout(resolve, 25));
  await transport.tick();
  transport.stop();
  assert.equal(handled.length, 1);
  assert.equal(handled[0].taskId, 'relay_2');
  assert.equal(handled[0].status, 'running');
});

test('实例令牌失效时自动重新注册', async () => {
  let registerCount = 0;
  const { transport } = makeTransport({
    handler: (path) => {
      if (path.endsWith('/register')) {
        registerCount += 1;
        return { instanceId: `ins_${registerCount}`, instanceToken: `tok_${registerCount}` };
      }
      if (path.endsWith('/instance')) return { instance: { id: 'x' } };
      return {};
    },
  });
  transport.state = { baseUrl: 'http://haos.test', instanceId: 'ins_stale', instanceToken: 'tok_stale' };
  const original = transport.fetch;
  transport.fetch = async (url, init = {}) => {
    if (new URL(url).pathname.endsWith('/instance')) {
      return new Response(JSON.stringify({ error: { code: 'instance_unauthorized' } }), { status: 401 });
    }
    return original(url, init);
  };
  await transport.ensureRegistered();
  assert.equal(registerCount, 1);
  assert.equal(transport.state.instanceId, 'ins_1');
});
