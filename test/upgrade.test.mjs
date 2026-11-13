import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createUpgradeService } from '../src/upgrade.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };
const root = fileURLToPath(new URL('..', import.meta.url));
const pkg = { name: 'dsh-cow', version: '9.9.9' };

function makeFakes({ version = '1.0.0' } = {}) {
  const peer = { relation: 'child', connected: true, node: { version } };
  const sent = [];
  const files = {
    async sendFile(input) { sent.push(input); return { files: [{ remotePath: '/child/cow-updates/dsh-cow-9.9.9.tgz' }] }; },
  };
  let task = null;
  const tasks = {
    assign(input) { task = { taskId: 'up1', ...input, upgrade: false }; return { taskId: 'up1' }; },
    get() { return task; },
  };
  const peers = { get: () => peer };
  return { peer, sent, files, tasks, peers, setVersion: (v) => { peer.node.version = v; } };
}

test('升级服务：推包、派任务、等待子端上报目标版本', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-upgrade-'));
  const fakes = makeFakes();
  const service = createUpgradeService({ root, pkg, files: fakes.files, tasks: fakes.tasks, peers: fakes.peers, home, logger: silent, pollMs: 5, timeoutMs: 500 });
  setTimeout(() => fakes.setVersion('9.9.9'), 20);
  const result = await service.upgradePeer('子 B');
  assert.equal(result.status, 'succeeded');
  assert.equal(result.version, '9.9.9');
  assert.equal(fakes.sent.length, 1);
  assert.match(fakes.sent[0].remotePath, /^cow-updates\//);
  assert.equal(fakes.tasks.get().upgrade, true);
  assert.match(fakes.tasks.get().prompt, /install_bundle/);
});

test('升级服务：目标版本必须等于本机版本，且只能升级直接下级', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-upgrade-'));
  const fakes = makeFakes();
  const service = createUpgradeService({ root, pkg, files: fakes.files, tasks: fakes.tasks, peers: fakes.peers, home, logger: silent, pollMs: 5, timeoutMs: 50 });
  await assert.rejects(() => service.upgradePeer('子 B', { targetVersion: '1.2.3' }), /当前版本/);
  fakes.peer.relation = 'parent';
  await assert.rejects(() => service.upgradePeer('主 DSH'), /直接下级/);
});
