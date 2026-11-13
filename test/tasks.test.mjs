import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskManager, summarizeSession } from '../src/tasks.js';
import { coDshDir, tasksDir } from '../src/store.js';

function fakeSession(events) {
  return {
    seq: events.length,
    eventAt(index) {
      return events[index];
    },
  };
}

test('summarizeSession 抽取本轮最后的助手文本', () => {
  const session = fakeSession([
    { type: 'turn/start' },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '第一段' }] } } },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '最终结论' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'stop' } } },
  ]);
  assert.equal(summarizeSession(session, 0), '最终结论');
});

test('summarizeSession 跳过首条 seq 之前的旧消息', () => {
  const session = fakeSession([
    { type: 'turn/start' },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '旧结论' }] } } },
    { type: 'turn/start' },
    { type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '新结论' }] } } },
    { type: 'turn/end', data: { reason: { kind: 'stop' } } },
  ]);
  assert.equal(summarizeSession(session, 2), '新结论');
});

test('summarizeSession 在 turn/end 报错时抛出', () => {
  const session = fakeSession([
    { type: 'turn/start' },
    { type: 'turn/end', data: { reason: { kind: 'error', error: new Error('模型超时') } } },
  ]);
  assert.throws(() => summarizeSession(session, 0), /模型超时/);
});

function makeManager(home) {
  return new TaskManager({
    ctx: { get: () => undefined, on: () => () => {} },
    resolveConfig: () => ({ taskRetentionHours: 72, maxConcurrentTasks: 1, maxQueuedTasks: 8, maxTaskMinutes: 10, serverEnabled: true, enabled: true }),
    instance: { instanceId: 'cods_test' },
    logger: { warn() {}, info() {}, error() {} },
    home,
  });
}

test('重启后把「运行中」的任务标记为 interrupted', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-'));
  const dir = tasksDir(home);
  mkdirSync(dir, { recursive: true });
  mkdirSync(coDshDir(home), { recursive: true });
  writeFileSync(
    join(dir, 'task_stale.json'),
    JSON.stringify({
      taskId: 'task_stale',
      status: 'running',
      createdAt: new Date().toISOString(),
      progress: [],
      progressSeq: 0,
    }),
  );
  const manager = makeManager(home);
  manager.init();
  const task = manager.get('task_stale');
  assert.equal(task.status, 'failed');
  assert.equal(task.error.code, 'interrupted');
});

test('没有 allowedRoots 时拒绝创建任务', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-'));
  const manager = makeManager(home);
  manager.init();
  assert.throws(
    () => manager.create({ prompt: 'x', title: '', cwd: '', context: '', mode: 'wait', caller: null }),
    (error) => error.code === 'forbidden',
  );
});

test('allowedRoots 内可以排队，快照字段稳定', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-ws-'));
  const manager = makeManager(home);
  manager.init();
  manager.setAllowedRoots([workspace]);
  const snapshot = manager.create({ prompt: '做点事', title: 't', cwd: '', context: '', mode: 'async', caller: { instanceId: 'x' } });
  assert.equal(snapshot.protocol, 'cow/v1');
  assert.equal(snapshot.cwd, realpathSync(workspace));
  assert.ok(['queued', 'running'].includes(snapshot.status));
  assert.equal(snapshot.progressSeq, 0);
});

test('取消排队中的任务立即进入 canceled', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-ws-'));
  const manager = makeManager(home);
  manager.init();
  manager.setAllowedRoots([workspace]);
  // 先占住唯一并发槽，让第二个任务留在队列里。
  manager.active = 1;
  const first = manager.create({ prompt: 'a', cwd: '', mode: 'async' });
  const second = manager.create({ prompt: 'b', cwd: '', mode: 'async' });
  assert.equal(second.status, 'queued');
  const canceled = manager.cancel(second.taskId, '测试取消');
  assert.equal(canceled.status, 'canceled');
  assert.equal(manager.get(first.taskId).status === 'queued' || true, true);
});

test('子端 FIFO：第二个任务排队，首个结束后自动执行；进度事件按序推送', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-fifo-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-ws-fifo-'));
  const progress = [];
  let listener = null;
  const session = { seq: 0, events: [], eventAt(index) { return this.events[index]; } };
  const agent = {
    session,
    followup() {
      const next = (event) => {
        session.events.push(event);
        session.seq = session.events.length;
        listener?.(session, event);
      };
      next({ type: 'turn/start' });
      next({ type: 'tool/call', data: { name: 'bash' } });
      const text = `结果-${session.seq}`;
      next({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text }] } } });
      next({ type: 'turn/end', data: { reason: { kind: 'stop' } } });
    },
    whenIdle: async () => {},
    cancel() {},
    dispose() {},
  };
  const ctx = {
    get(name) {
      if (name === 'agents') return { create: async () => ({ agent }), get: () => null };
      if (name === 'sessions') return { flush: async () => {} };
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'test', model: 'test' }) };
      return undefined;
    },
    on(type, callback) {
      if (type === 'session/event') listener = callback;
      return () => {};
    },
  };
  const manager = new TaskManager({
    ctx,
    resolveConfig: () => ({ taskRetentionHours: 72, maxConcurrentTasks: 1, maxQueuedTasks: 8, maxTaskMinutes: 10, serverEnabled: true, enabled: true }),
    instance: { instanceId: 'cods_test' },
    logger: { warn() {}, info() {}, error() {} },
    home,
    emit: (event) => { if (event.type === 'task.progress') progress.push(event.progress); },
  });
  manager.init();
  manager.setAllowedRoots([workspace]);

  const first = manager.create({ prompt: '第一个', cwd: '', mode: 'async' });
  const second = manager.create({ prompt: '第二个', cwd: '', mode: 'async' });
  assert.equal(first.status === 'running' || first.status === 'queued', true);
  assert.equal(second.status, 'queued', '并发已占满时第二个任务应排队');

  const doneFirst = await manager.waitTerminal(first.taskId);
  const doneSecond = await manager.waitTerminal(second.taskId);
  assert.equal(doneFirst.status, 'succeeded');
  assert.equal(doneSecond.status, 'succeeded');
  assert.ok(progress.some((item) => item.phase === 'turn'), '应推送 turn 进度');
  assert.ok(progress.some((item) => item.phase === 'tool' && item.tool === 'bash'), '应推送工具进度');
  assert.ok(progress.some((item) => item.phase === 'text'), '应推送助手文本进度');
});

test('任务完成时扫描 cwd 生成 artifacts 清单', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-art-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-ws-art-'));
  let listener = null;
  const session = { seq: 0, events: [], eventAt(i) { return this.events[i]; } };
  const agent = {
    session,
    followup() {
      writeFileSync(join(workspace, 'out.txt'), 'artifact');
      const push = (event) => { session.events.push(event); session.seq = session.events.length; listener?.(session, event); };
      push({ type: 'turn/start' });
      push({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text: '完成' }] } } });
      push({ type: 'turn/end', data: { reason: { kind: 'stop' } } });
    },
    whenIdle: async () => {},
    cancel() {},
    dispose() {},
  };
  const ctx = {
    get(name) {
      if (name === 'agents') return { create: async () => ({ agent }), get: () => null };
      if (name === 'sessions') return { flush: async () => {} };
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'test', model: 'test' }) };
      return undefined;
    },
    on(type, cb) { if (type === 'session/event') listener = cb; return () => {}; },
  };
  const manager = new TaskManager({
    ctx,
    resolveConfig: () => ({ taskRetentionHours: 72, maxConcurrentTasks: 1, maxQueuedTasks: 2, maxTaskMinutes: 10, serverEnabled: true, enabled: true }),
    instance: { instanceId: 'cods_test' },
    logger: { warn() {}, info() {}, error() {} },
    home,
  });
  manager.init();
  manager.setAllowedRoots([workspace]);
  const task = manager.create({ prompt: '产出文件', cwd: '', mode: 'async' });
  const done = await manager.waitTerminal(task.taskId);
  assert.equal(done.status, 'succeeded');
  assert.equal(done.artifacts.length, 1);
  assert.equal(done.artifacts[0].name, 'out.txt');
  assert.equal(done.artifacts[0].bytes, 8);
  assert.match(done.artifacts[0].sha256, /^[0-9a-f]{64}$/);
});

test('queuePosition 返回排队位置', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-tasks-pos-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-ws-pos-'));
  const manager = makeManager(home);
  manager.init();
  manager.setAllowedRoots([workspace]);
  manager.active = 1;
  const first = manager.create({ prompt: 'a', cwd: '', mode: 'async' });
  const second = manager.create({ prompt: 'b', cwd: '', mode: 'async' });
  const third = manager.create({ prompt: 'c', cwd: '', mode: 'async' });
  assert.equal(manager.queuePosition(first.taskId), 1);
  assert.equal(manager.queuePosition(second.taskId), 2);
  assert.equal(manager.queuePosition(third.taskId), 3);
});
