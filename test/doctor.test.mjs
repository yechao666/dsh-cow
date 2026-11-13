import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDoctor } from '../src/doctor.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

test('cow_doctor 生成诊断 JSON，不包含密码/token', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-doctor-'));
  const doctor = createDoctor({
    instance: { instanceId: 'cow_self', displayName: 'self', version: '1.7.0', role: 'member' },
    channel: {
      connections: () => [{ peer: '子 B', direction: 'in', e2e: true }],
      status: () => ({ state: 'connected', direction: 'in', e2e: true, lastError: null }),
    },
    peers: { list: () => [{ label: '子 B', relation: 'child', instanceId: 'cow_b' }] },
    tasks: {
      list: () => [
        { taskId: 't1', peer: '子 B', status: 'queued', title: '排队任务', createdAt: '2026-01-01T00:00:00.000Z' },
        { taskId: 't2', peer: '子 B', status: 'failed', title: '失败任务', error: '超时', createdAt: '2026-01-02T00:00:00.000Z' },
      ],
    },
    manager: { list: () => [{ taskId: 'in1', status: 'running', title: '入站' }] },
    files: { stats: () => ({ sent: 1, received: 2 }) },
    home,
    resolveConfig: () => ({ enabled: true, serverEnabled: true, listenPort: 59999, allowedRoots: '/tmp/a,/tmp/b', maxFileMB: 50 }),
    logger: silent,
  });
  const { path, report } = doctor();
  assert.ok(existsSync(path));
  assert.equal(report.schema, 'cow/v1/doctor');
  assert.equal(report.outboundTasks.counts.queued, 1);
  assert.equal(report.outboundTasks.counts.failed, 1);
  assert.equal(report.inboundTasks.counts.running, 1);
  assert.equal(report.channel.encryptedConnections, 1);
  assert.deepEqual(report.config.allowedRoots, ['/tmp/a', '/tmp/b']);
  const text = readFileSync(path, 'utf8');
  assert.ok(!/password|token|secret/i.test(text), '诊断包不得包含密码/token 字段');
  assert.ok(text.includes('cow_self'));
});
