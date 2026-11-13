import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';
import { createAdminHandlers } from '../src/admin-api.js';
import { DEFAULT_ALLOWED_ROOT } from '../src/config.js';
import { PeerRegistry } from '../src/peers.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function call(handler, { method = 'GET', body = null } = {}) {
  return new Promise((resolve) => {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    req.method = method;
    req.headers = {};
    const chunks = [];
    const res = {
      statusCode: 0,
      headers: {},
      writeHead(status, headers) { this.statusCode = status; this.headers = headers ?? {}; },
      end(chunk) { if (chunk) chunks.push(Buffer.from(chunk)); resolve({ status: this.statusCode, json: JSON.parse(Buffer.concat(chunks).toString() || '{}') }); },
    };
    handler(req, res);
  });
}

function makeRig({ password = '', answer = () => {}, cancel = () => {}, upgrade = null, doctor = null, saveSettings = () => {}, tasks: tasksOverride = null } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'cow-admin-'));
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  const saved = { password: '', parent: null };
  const instance = {
    instanceId: 'cow_self', displayName: 'self', version: '1.0.0', role: 'leader', description: 'node desc',
    parentUrl: '', parentPassword: '', parent: null,
  };
  const channel = {
    status: () => ({ state: 'offline' }),
    connections: () => [],
  };
  const handlers = createAdminHandlers({
    instance,
    resolveConfig: () => ({ displayName: 'self', capabilityNote: '', allowedRoots: '', listenHost: '127.0.0.1', listenPort: 0 }),
    peers,
    channel,
    tasks: tasksOverride ?? { list: () => [], answer, cancel },
    upgrade,
    doctor,
    currentInbound: () => null,
    passwordConfigured: () => Boolean(password),
    setPassword: (value) => { saved.password = value; password = value; },
    getParentPassword: () => instance.parentPassword,
    saveParentAuth: (value) => { saved.parent = value; instance.parentUrl = value.url; instance.parentPassword = value.password; },
    saveSettings,
    applySettings: async () => {},
    getEndpoint: () => 'http://127.0.0.1:49170/cow/v1',
    pluginVersion: '1.0.0',
  });
  return { handlers, peers, instance, saved };
}

test('GET /state 返回节点、版本、连接与父节点信息', async () => {
  const { handlers } = makeRig();
  const { status, json } = await call(handlers['/api/cow/state']);
  assert.equal(status, 200);
  assert.equal(json.defaultAllowedRoot, DEFAULT_ALLOWED_ROOT);
  assert.equal(json.instance.version, '1.0.0');
  assert.equal(json.pluginVersion, '1.0.0');
  assert.equal(json.passwordConfigured, false);
  assert.equal(json.parent.url, '');
  assert.deepEqual(json.tasks, []);
});

test('POST /password 校验长度并保存（不回显）', async () => {
  const { handlers, saved } = makeRig();
  const short = await call(handlers['/api/cow/password'], { method: 'POST', body: { password: '123' } });
  assert.equal(short.status, 400);
  const ok = await call(handlers['/api/cow/password'], { method: 'POST', body: { password: 'cowpass-123456' } });
  assert.equal(ok.status, 200);
  assert.equal(saved.password, 'cowpass-123456');
  assert.equal(JSON.stringify(ok.json).includes('cowpass-123456'), false);
});

test('POST /parent 保存上级地址与密码并校验 URL', async () => {
  const { handlers, saved } = makeRig();
  const bad = await call(handlers['/api/cow/parent'], { method: 'POST', body: { url: 'ftp://x', password: 'cowpass123' } });
  assert.equal(bad.status, 400);
  const ok = await call(handlers['/api/cow/parent'], { method: 'POST', body: { url: 'ws://127.0.0.1:49170/cow/v1/channel', password: 'cowpass123' } });
  assert.equal(ok.status, 200);
  assert.equal(saved.parent.url, 'ws://127.0.0.1:49170/cow/v1/channel');
  assert.equal(saved.parent.password, 'cowpass123');
});


test('POST /answer 回答远端提问；GET /doctor 返回诊断包', async () => {
  const answered = [];
  const { handlers } = makeRig({
    answer: (taskId, answer) => answered.push({ taskId, answer }),
    doctor: () => ({ path: '/tmp/doctor.json', report: { schema: 'cow/v1/doctor', channel: { connected: 0 } } }),
  });
  const answerResult = await call(handlers['/api/cow/answer'], { method: 'POST', body: { taskId: 't1', answer: 'B' } });
  assert.equal(answerResult.status, 200);
  assert.deepEqual(answered, [{ taskId: 't1', answer: 'B' }]);

  const doctorResult = await call(handlers['/api/cow/doctor']);
  assert.equal(doctorResult.status, 200);
  assert.equal(doctorResult.json.report.schema, 'cow/v1/doctor');
  assert.equal(doctorResult.json.path, '/tmp/doctor.json');
});


test('保存空 allowedRoots 时自动改成 ~/dsh-cow-root', async () => {
  let saved = null;
  const { handlers } = makeRig({ saveSettings: (patch) => { saved = patch; } });
  const result = await call(handlers['/api/cow/settings'], { method: 'POST', body: { allowedRoots: '   ' } });
  assert.equal(result.status, 200);
  assert.equal(saved.allowedRoots, DEFAULT_ALLOWED_ROOT);
});


test('POST /cancel 取消任务', async () => {
  const cancelled = [];
  const { handlers } = makeRig({ cancel: (taskId, reason) => cancelled.push({ taskId, reason }) });
  const result = await call(handlers['/api/cow/cancel'], { method: 'POST', body: { taskId: 't1' } });
  assert.equal(result.status, 200);
  assert.deepEqual(cancelled, [{ taskId: 't1', reason: '配置页取消' }]);
});


test('设置连接密码要求至少 12 个字符', async () => {
  const { handlers } = makeRig();
  const short = await call(handlers['/api/cow/password'], { method: 'POST', body: { password: '123456' } });
  assert.equal(short.status, 400);
  assert.match(short.json.error.message, /至少 12/);
});


test('POST /upgrade 调用升级服务', async () => {
  const calls = [];
  const { handlers } = makeRig({ upgrade: { upgradePeer: async (peer) => { calls.push(peer); return { status: 'succeeded', peer, version: '9.9.9' }; } } });
  const result = await call(handlers['/api/cow/upgrade'], { method: 'POST', body: { peer: '子 B' } });
  assert.equal(result.status, 200);
  assert.deepEqual(calls, ['子 B']);
  assert.equal(result.json.status, 'succeeded');
});

test('POST /answer 支持按 questionId 回答未绑定任务的提问', async () => {
  let answered = null;
  const tasks = {
    list: () => [],
    answer: () => {},
    answerQuestion: (questionId, answer) => { answered = { questionId, answer }; },
  };
  const { handlers } = makeRig({ tasks });
  const result = await call(handlers['/api/cow/answer'], { method: 'POST', body: { questionId: 'q1', answer: '允许一次' } });
  assert.equal(result.status, 200);
  assert.deepEqual(answered, { questionId: 'q1', answer: '允许一次' });
});
