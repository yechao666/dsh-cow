import assert from 'node:assert/strict';
import test from 'node:test';
import { createDoctor } from '../src/doctor.js';
import { createAdminHandlers } from '../src/admin-api.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

function fakeDeps() {
  const state = {
    instance: { peerId: 'cow_self', displayName: 'self', version: '1.26.0', role: 'member', uuid: 'u1', description: 'desc', parentUrl: 'ws://parent/cow/v1/channel', parentPassword: 'secret-value' },
    resolveConfig: () => ({
      enabled: true,
      serverEnabled: true,
      listenPort: 59999,
      listenHost: '127.0.0.1',
      allowedRoots: '/tmp/a,/tmp/b',
      maxFileMB: 50,
      maxConcurrentFiles: 4,
      agentPreset: '',
      displayName: 'self',
      capabilityNote: 'note',
      channelDial: 'auto',
    }),
    peers: {
      list: () => [
        { label: '子 B', relation: 'child', peerId: 'cow_b' },
        { label: '主 DSH', relation: 'parent', peerId: 'cow_p' },
      ],
      remove: () => {},
    },
    channel: {
      connections: () => [{ peer: '子 B', direction: 'in', e2e: true }],
      status: (label) => ({ state: 'connected', direction: 'in', e2e: label === '子 B', lastError: null, node: { version: '1.20.0', description: 'child' } }),
    },
    router: {
      pending: () => [{ questionId: 'q1', peer: '子 B', question: '要 A 还是 B？', options: ['A', 'B'], session: 's1', createdAt: '2026-01-01T00:00:00.000Z' }],
      answer: () => ({ questionId: 'q1', status: 'sent' }),
    },
    activity: { list: () => [{ id: 1, at: '2026-01-01T00:00:00.000Z', kind: 'message', text: '派发消息', peerName: '子 B', status: 'sent' }] },
    files: { stats: () => ({ sent: 1, received: 2 }) },
    doctor: null,
    passwordConfigured: () => true,
    setPassword: () => {},
    getParentPassword: () => 'secret-value',
    saveParentAuth: () => {},
    saveSettings: () => {},
    applySettings: async () => {},
    getEndpoint: () => 'http://127.0.0.1:59999/cow/v1',
    pluginVersion: '1.26.0',
  };
  return state;
}

test('doctor 报告只含消息与连接信息，不含任务字段与密码', async () => {
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const deps = fakeDeps();
  const home = mkdtempSync(join(tmpdir(), 'cow-doctor-'));
  const doctor = createDoctor({ ...deps, home, logger: silent, startedAt: Date.now() });
  const { path, report } = doctor();
  assert.ok(path.endsWith('.json'));
  assert.equal(report.schema, 'cow/v1/doctor');
  assert.equal(report.messages.pendingAsks, 1);
  assert.equal(report.outboundTasks, undefined);
  assert.equal(report.inboundTasks, undefined);
  assert.equal(report.channel.encryptedConnections, 1);
  assert.deepEqual(report.config.allowedRoots, ['/tmp/a', '/tmp/b']);
  const text = readFileSync(path, 'utf8');
  assert.ok(!/password|token|secret/i.test(text), '诊断包不得包含密码/token 字段');
  assert.ok(text.includes('cow_self'));
});

test('admin state 返回节点、待回答询问，不含任务队列', async () => {
  const deps = fakeDeps();
  const handlers = createAdminHandlers(deps);
  assert.ok(handlers['/api/cow/state']);
  const res = {
    status: 0,
    headers: {},
    writeHead(status, headers) { this.status = status; this.headers = headers; },
    end(body) { this.body = body; },
  };
  await handlers['/api/cow/state']({ method: 'GET', url: '/api/cow/state' }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.status, 200);
  assert.equal(body.tasks, undefined);
  assert.equal(body.inboundTasks, undefined);
  assert.equal(body.currentInbound, undefined);
  assert.equal(body.pendingAsks.length, 1);
  assert.equal(body.stats.pendingAsks, 1);
  assert.equal(body.peers[0].peerName, '子 B');
  assert.equal(body.passwordConfigured, true);
});

test('admin answer 只接受 questionId，并回子端', async () => {
  const { Readable } = await import('node:stream');
  const deps = fakeDeps();
  let answered = null;
  deps.router.answer = (questionId, answer) => { answered = { questionId, answer }; return { questionId, status: 'sent' }; };
  const handlers = createAdminHandlers(deps);
  const res = {
    status: 0,
    writeHead(status) { this.status = status; },
    end(body) { this.body = body; },
  };
  const req = Readable.from([Buffer.from(JSON.stringify({ questionId: 'q1', answer: '允许一次' }))]);
  req.method = 'POST';
  req.url = '/api/cow/answer';
  await handlers['/api/cow/answer'](req, res);
  assert.equal(res.status, 200);
  assert.deepEqual(answered, { questionId: 'q1', answer: '允许一次' });
});
