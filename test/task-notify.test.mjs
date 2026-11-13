import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TaskManager } from '../src/tasks.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

/**
 * 验证「任务终态 → 宿主 emit → 通道推送」这段接线：
 * 这是 index.js 里真实使用的形状（emit 把 callerLabel 当通道键）。
 */
function makeRig({ config = {}, hangOnIdle = false, liveAgent = null, resumeFails = false } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'cow-task-notify-'));
  const workspace = mkdtempSync(join(tmpdir(), 'cow-task-ws-'));
  const events = [];
  const session = {
    id: 'session-remote-1',
    get seq() {
      return events.length;
    },
    eventAt(index) {
      return events[index];
    },
  };
  const calls = [];
  const agentCalls = { create: 0, resume: 0, get: 0 };
  let releaseIdle;
  const idleGate = new Promise((resolve) => {
    releaseIdle = resolve;
  });
  const agentPresets = {
    defaultId: 'standard',
    async select(_agent, presetId) {
      calls.push(['select', presetId]);
    },
  };
  const agent = {
    session,
    followup() {
      calls.push(['followup']);
      events.push({ type: 'turn/start', seq: events.length });
      events.push({
        type: 'assistant/message',
        seq: events.length,
        data: { message: { content: [{ type: 'text', text: '结论：已构建完成' }] } },
      });
      events.push({ type: 'turn/end', seq: events.length, data: { reason: { kind: 'stop' } } });
    },
    whenIdle: hangOnIdle ? () => idleGate : async () => {},
    cancel() {
      releaseIdle?.();
    },
  };
  const ctx = {
    get(name) {
      if (name === 'agents') {
        return {
          create: async () => {
            agentCalls.create += 1;
            return { agent };
          },
          resume: async () => {
            agentCalls.resume += 1;
            if (resumeFails) throw new Error('session "x" is already owned by an active write handle');
            return { agent };
          },
          get: (id) => {
            agentCalls.get += 1;
            return liveAgent?.session?.id === id ? liveAgent : undefined;
          },
        };
      }
      if (name === 'sessions') return { flush: async () => {} };
      if (name === 'agentDefaultModel') return { currentSelection: () => ({ provider: 'p', model: 'm' }) };
      if (name === 'subagents') return { waitForChildren: async () => false };
      if (name === 'agentPresets') return agentPresets;
      return undefined;
    },
    on() {
      return () => {};
    },
  };
  const pushed = [];
  const channel = { send: (label, event) => (pushed.push({ label, event }), { queued: true, delivered: false }) };
  const manager = new TaskManager({
    ctx,
    resolveConfig: () => ({
      taskRetentionHours: 72,
      maxConcurrentTasks: 2,
      maxQueuedTasks: 8,
      maxTaskMinutes: 10,
      serverEnabled: true,
      enabled: true,
      ...config,
    }),
    instance: { instanceId: 'cods_target' },
    logger: silent,
    home,
    emit: (event) => {
      const label = event?.task?.callerLabel;
      if (!label) return;
      channel.send(label, { type: event.type, payload: event.task });
    },
  }).init();
  manager.setAllowedRoots([workspace]);
  return { manager, pushed, workspace, home, calls, agentCalls, agent };
}

test('任务完成会把 task.completed 推给发起方（含摘要与 callerLabel）', async () => {
  const { manager, pushed, workspace } = makeRig();
  const created = manager.create({
    prompt: '构建 iOS 包',
    title: 'iOS 构建',
    cwd: workspace,
    mode: 'async',
    caller: { instanceId: 'cods_caller', displayName: 'linux-box' },
  }, { callerLabel: 'linux-box' });
  const done = await manager.wait(created.taskId, 5_000);
  assert.equal(done.status, 'succeeded');
  assert.match(done.summary, /已构建完成/);

  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].label, 'linux-box');
  assert.equal(pushed[0].event.type, 'task.completed');
  assert.equal(pushed[0].event.payload.taskId, created.taskId);
  assert.match(pushed[0].event.payload.summary, /已构建完成/);
  assert.equal(pushed[0].event.payload.status, 'succeeded');
});

test('取消排队中的任务会推 task.canceled', async () => {
  const { manager, pushed, workspace } = makeRig();
  // 占满并发，让第二个任务留在队列里再取消。
  manager.active = 1;
  const first = manager.create({ prompt: 'a', cwd: workspace, mode: 'async' }, { callerLabel: 'linux-box' });
  const second = manager.create({ prompt: 'b', cwd: workspace, mode: 'async' }, { callerLabel: 'linux-box' });
  assert.equal(second.status, 'queued');
  manager.cancel(second.taskId, '调用方取消');
  const canceled = pushed.find((item) => item.event.payload?.taskId === second.taskId);
  assert.ok(canceled);
  assert.equal(canceled.event.type, 'task.canceled');
  assert.equal(canceled.label, 'linux-box');
  manager.active = 0;
  manager.cancel(first.taskId, '清理');
});

test('新会话先选 agent preset，再开始第一轮（否则没有 bash 等工具）', async () => {
  const { manager, workspace, calls } = makeRig();
  const created = manager.create({ prompt: '跑个命令', cwd: workspace, mode: 'async' });
  await manager.wait(created.taskId, 5_000);
  assert.deepEqual(calls[0], ['select', 'standard']);
  assert.deepEqual(calls[1], ['followup']);
});

test('配置了 agentPreset 时优先使用它', async () => {
  const { manager, workspace, calls } = makeRig({ config: { agentPreset: 'creator' } });
  const created = manager.create({ prompt: '跑个命令', cwd: workspace, mode: 'async' });
  await manager.wait(created.taskId, 5_000);
  assert.deepEqual(calls[0], ['select', 'creator']);
});

test('运行中的任务被取消后也会推 task.canceled（不只是排队中的）', async () => {
  const { manager, pushed, workspace } = makeRig({ hangOnIdle: true });
  const created = manager.create({ prompt: 'sleep 120', title: '长任务', cwd: workspace, mode: 'async' }, { callerLabel: 'linux-box' });
  assert.equal(manager.get(created.taskId).status, 'running');
  manager.cancel(created.taskId, '联调取消路径');
  const done = await manager.wait(created.taskId, 5_000);
  assert.equal(done.status, 'canceled');
  const canceled = pushed.find((item) => item.event.payload?.taskId === created.taskId);
  assert.ok(canceled, '取消也应推送事件');
  assert.equal(canceled.event.type, 'task.canceled');
  assert.equal(canceled.event.payload.status, 'canceled');
});

test('会话已在本进程活着时复用 agent，不再 resume（避免写入句柄冲突）', async () => {
  const live = {
    session: { id: 'session-live-1', seq: 0, eventAt: () => undefined },
    followup() {},
    whenIdle: async () => {},
    cancel() {},
  };
  // 先跑一个任务把记录建出来，再把它的 agent 清空、会话指向 live agent。
  const rig = makeRig({ liveAgent: live });
  const created = rig.manager.create({ prompt: '第一轮', cwd: rig.workspace, mode: 'async' }, { callerLabel: 'linux-box' });
  await rig.manager.wait(created.taskId, 5_000);
  const task = rig.manager.get(created.taskId);
  task.agent = null;
  task.sessionId = 'session-live-1';
  rig.manager.startMessage(created.taskId, { message: '第二轮' });
  await rig.manager.wait(created.taskId, 5_000);
  assert.equal(rig.agentCalls.resume, 0, '不应调用 resume');
  assert.ok(rig.agentCalls.get >= 1, '应先查 live agent');
});

test('resume 失败时给出可对照诊断', async () => {
  const rig = makeRig({ resumeFails: true });
  const created = rig.manager.create({ prompt: '第一轮', cwd: rig.workspace, mode: 'async' }, { callerLabel: 'linux-box' });
  await rig.manager.wait(created.taskId, 5_000);
  const task = rig.manager.get(created.taskId);
  task.agent = null;
  task.sessionId = 'session-locked-1';
  rig.manager.startMessage(created.taskId, { message: '第二轮' });
  const done = await rig.manager.wait(created.taskId, 5_000);
  assert.equal(done.status, 'failed');
  assert.match(done.error.message, /无法恢复远端任务会话 session-locked-1/);
  assert.match(done.error.message, /already owned|重新委派/);
});

test('没有 callerLabel 的任务不推事件（本地直接创建的任务）', async () => {
  const { manager, pushed, workspace } = makeRig();
  const created = manager.create({ prompt: '本地任务', cwd: workspace, mode: 'async' });
  const done = await manager.wait(created.taskId, 5_000);
  assert.equal(done.status, 'succeeded');
  assert.equal(pushed.length, 0);
});
