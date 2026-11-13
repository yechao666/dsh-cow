import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CowTasks } from '../src/cow-tasks.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

function makeChannel() {
  const sent = [];
  return { sent, send: (peer, frame) => { sent.push({ peer, frame }); return { delivered: true }; } };
}

test('出站任务落盘；重启后未完成任务标记为中断，可 retry', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-'));
  const channel = makeChannel();
  const first = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const created = first.assign({ peer: '子 B', prompt: 'hello', cwd: '/tmp' });
  assert.equal(created.status, 'running');
  assert.equal(existsSync(join(home, 'cow/out-tasks', `${created.taskId}.json`)), true);

  const second = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const restored = second.get(created.taskId);
  assert.equal(restored.status, 'failed');
  assert.match(restored.error, /重启/);

  const retried = second.retry(created.taskId);
  assert.equal(retried.status, 'running');
  assert.equal(channel.sent.filter((item) => item.frame.type === 'task.assign').length, 2);
});

test('taskId 幂等：重复 assign 返回同一任务且只发送一次', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-idem-'));
  const channel = makeChannel();
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const a = tasks.assign({ peer: '子 B', prompt: 'hello', cwd: '/tmp', taskId: 'fixed-id' });
  const b = tasks.assign({ peer: '子 B', prompt: 'hello', cwd: '/tmp', taskId: 'fixed-id' });
  assert.equal(a.taskId, b.taskId);
  assert.equal(channel.sent.length, 1);
});

test('对端离线时任务进入队列，上线后 flushQueue 自动下发', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-queue-'));
  const channel = { delivered: false, sent: [], send(peer, frame) { this.sent.push({ peer, frame }); return { delivered: this.delivered }; } };
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const created = tasks.assign({ peer: '子 B', prompt: '离线任务', cwd: '/tmp' });
  assert.equal(created.status, 'queued');
  assert.ok(created.queueExpiresAt);
  assert.equal(tasks.snapshot(tasks.get(created.taskId)).attempts, 0);

  channel.delivered = true;
  const flushed = tasks.flushQueue('子 B');
  assert.equal(flushed.sent, 1);
  assert.equal(tasks.get(created.taskId).status, 'running');
  assert.equal(channel.sent.filter((item) => item.frame.type === 'task.assign').length, 2);

  // 重复冲刷不会重发运行中的任务。
  assert.equal(tasks.flushQueue('子 B').sent, 0);
});

test('离线队列超时判失败；取消后不再下发', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-expire-'));
  let now = 1_000;
  const channel = { delivered: false, sent: [], send(peer, frame) { this.sent.push({ peer, frame }); return { delivered: this.delivered }; } };
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home, queueTtlMs: 5_000, now: () => now });
  const first = tasks.assign({ peer: '子 B', prompt: '会过期', cwd: '/tmp' });
  const second = tasks.assign({ peer: '子 B', prompt: '会取消', cwd: '/tmp' });
  tasks.cancel(second.taskId, '不需要了');
  now += 6_000;
  channel.delivered = true;
  const flushed = tasks.flushQueue('子 B');
  assert.equal(flushed.failed, 1);
  assert.equal(tasks.get(first.taskId).status, 'failed');
  assert.match(tasks.get(first.taskId).error, /超时/);
  assert.equal(tasks.get(second.taskId).status, 'canceled');
  assert.equal(channel.sent.filter((item) => item.frame.type === 'task.assign').length, 2); // 首次两次，取消/过期都不再发
});

test('远端提问进入 pendingQuestion，回答后回传 task.answer 并清空', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-question-'));
  const channel = makeChannel();
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const created = tasks.assign({ peer: '子 B', prompt: '需要选择', cwd: '/tmp' });
  tasks.onEvent({
    from: '子 B',
    event: 'task.question',
    payload: { taskId: created.taskId, questionId: 'q1', question: '用 A 还是 B？', options: ['A', 'B'] },
  });
  const asked = tasks.get(created.taskId);
  assert.equal(asked.pendingQuestion.question, '用 A 还是 B？');
  assert.deepEqual(asked.pendingQuestion.options, ['A', 'B']);
  const answered = tasks.answer(created.taskId, 'A');
  assert.equal(answered.pendingQuestion, null);
  const answerFrame = channel.sent.find((item) => item.frame.type === 'task.answer');
  assert.equal(answerFrame.frame.payload.questionId, 'q1');
  assert.equal(answerFrame.frame.payload.answer, 'A');
  assert.throws(() => tasks.answer(created.taskId, '再次回答'), /没有待回答/);
});

test('任务结果里的 artifacts 自动拉取小文件到本地', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-art-'));
  const channel = makeChannel();
  const saved = [];
  const files = {
    async requestFile({ remotePath, localPath }) {
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname } = await import('node:path');
      mkdirSync(dirname(localPath), { recursive: true });
      writeFileSync(localPath, 'abc');
      saved.push({ remotePath, localPath });
      return { localPath, bytes: 3, sha256: 'f'.repeat(64) };
    },
  };
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home, files });
  const created = tasks.assign({ peer: '子 B', prompt: '产出', cwd: '/tmp' });
  tasks.onEvent({
    from: '子 B',
    event: 'task.result',
    payload: {
      taskId: created.taskId,
      status: 'succeeded',
      summary: '完成',
      artifacts: [{ name: 'out/a.txt', path: '/remote/out/a.txt', bytes: 3, sha256: 'f'.repeat(64) }],
    },
  });
  for (let i = 0; i < 50 && !tasks.get(created.taskId).artifacts?.[0]?.localPath; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const artifact = tasks.get(created.taskId).artifacts[0];
  assert.equal(artifact.localPath, saved[0].localPath);
  assert.match(artifact.localPath, /artifacts\/cowtask_/);
});

test('子端进度可把父端任务改回 queued 并记录队列位置，随后回到 running', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-out-queue-status-'));
  const channel = makeChannel();
  const tasks = new CowTasks({ channel, instance: { instanceId: 'cow_a' }, logger: silent, home });
  const created = tasks.assign({ peer: '子 B', prompt: '排队状态', cwd: '/tmp' });
  tasks.onEvent({
    from: '子 B',
    event: 'task.progress',
    payload: { taskId: created.taskId, status: 'queued', position: 2, text: '已进入本机任务队列' },
  });
  assert.equal(tasks.get(created.taskId).status, 'queued');
  assert.equal(tasks.snapshot(tasks.get(created.taskId)).queuePosition, 2);
  tasks.onEvent({
    from: '子 B',
    event: 'task.progress',
    payload: { taskId: created.taskId, status: 'running', text: '开始执行任务' },
  });
  assert.equal(tasks.get(created.taskId).status, 'running');
  assert.equal(tasks.snapshot(tasks.get(created.taskId)).queuePosition, 0);
});
