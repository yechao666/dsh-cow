import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Channel } from '../src/channel.js';
import { hashJoinPassword } from '../src/identity.js';
import { PeerRegistry } from '../src/peers.js';
import { CowTasks } from '../src/cow-tasks.js';
import { createHandler } from '../src/server.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

async function waitFor(predicate, { timeout = 5000, interval = 20 } = {}) {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return true;
    if (Date.now() - start > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function makePair() {
  const homeA = mkdtempSync(join(tmpdir(), 'cow-a-'));
  const homeB = mkdtempSync(join(tmpdir(), 'cow-b-'));
  const peersA = new PeerRegistry({ file: join(homeA, 'peers.json') });
  const peersB = new PeerRegistry({ file: join(homeB, 'peers.json') });
  const instanceA = { instanceId: 'cow_aaaa', displayName: 'main', version: '1.0.0', description: 'main node', passwordSalt: 's', passwordHash: hashJoinPassword('cowpass123', 's') };
  const instanceB = { instanceId: 'cow_bbbb', displayName: '', version: '1.0.0', description: 'child node', role: 'member' };
  let channelA;
  let channelB;
  const tasks = new CowTasks({ channel: null, instance: instanceA, logger: silent });
  channelA = new Channel({
    ctx: {}, resolveConfig: () => ({ channelEnabled: true, serverEnabled: true }), peers: peersA, instance: instanceA,
    authorize: (password) => (password === 'cowpass123' ? { kind: 'join', label: '' } : null),
    onEvent: ({ from, event }) => tasks.onEvent({ from, event: event.type, payload: event.payload }),
    onPeer: ({ label, instanceId, node }) => {
      const peerLabel = `子 DSH-${instanceId.slice(-4)}`;
      peersA.upsert({ url: '', token: '', label: peerLabel, instanceId, relation: 'child', depth: 1, capabilitySummary: node?.description ?? '' });
      channelA.rebind(instanceId, peerLabel);
    },
    logger: silent, home: homeA,
  });
  tasks.channel = channelA;
  channelB = new Channel({
    ctx: {}, resolveConfig: () => ({ channelEnabled: true, serverEnabled: true }), peers: peersB, instance: instanceB,
    authorize: () => null,
    onEvent: ({ from, event }) => {
      if (event.type === 'task.offer') {
        channelB.send(from, { type: 'task.claim', payload: { taskId: event.payload.taskId } });
        return;
      }
      if (event.type !== 'task.body') return;
      setTimeout(() => channelB.send(from, { type: 'task.result', payload: { taskId: event.payload.taskId, status: 'succeeded', summary: 'done over ws' } }), 20);
    },
    logger: silent, home: homeB,
  });
  const handler = createHandler({ channel: channelA, info: instanceA });
  const server = createServer((req, res) => handler(req, res));
  server.on('upgrade', (req, socket, head) => channelA.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  peersB.upsert({ url: `http://127.0.0.1:${port}/cow/v1`, token: 'cowpass123', label: 'main', instanceId: 'cow_aaaa', relation: 'parent' });
  channelA.start();
  channelB.start();
  return { channelA, channelB, tasks, peersA, close: async () => { channelA.stop(); channelB.stop(); await new Promise((r) => server.close(r)); } };
}

test('子 DSH 用密码建立 WebSocket，主 DSH 自动登记并收发节点信息', async () => {
  const pair = await makePair();
  try {
    assert.ok(await waitFor(() => pair.channelA.connectedCount() === 1));
    assert.ok(await waitFor(() => pair.channelB.connectedCount() === 1));
    const peer = pair.peersA.list()[0];
    assert.equal(peer.relation, 'child');
    assert.match(peer.label, /^子 DSH-/);
    const status = pair.channelA.status(peer.label);
    assert.equal(status.state, 'connected');
    assert.equal(status.node.description, 'child node');
  } finally {
    await pair.close();
  }
});

test('任务通过 WebSocket 下发并在完成后回传结果', async () => {
  const pair = await makePair();
  try {
    assert.ok(await waitFor(() => pair.channelB.connectedCount() === 1 && pair.channelA.connectedCount() === 1));
    const peer = pair.peersA.list()[0];
    const created = pair.tasks.assign({ peer: peer.label, prompt: 'hello', cwd: '', timeoutSec: 30 });
    assert.equal(created.status, 'running');
    assert.ok(await waitFor(() => pair.tasks.get(created.taskId)?.status === 'succeeded', { timeout: 4000 }));
    const snapshot = pair.tasks.snapshot(pair.tasks.get(created.taskId));
    assert.equal(snapshot.summary, 'done over ws');
  } finally {
    await pair.close();
  }
});
