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

async function waitFor(predicate, timeout = 5000) {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return true;
    if (Date.now() - start > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

async function listen(channel) {
  const server = createServer((req, res) => createHandler({ channel, info: {} })(req, res));
  server.on('upgrade', (req, socket, head) => channel.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/cow/v1` };
}

function makeChannel({ home, instance, peers, authorize, onEvent }) {
  return new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance,
    authorize,
    onEvent,
    logger: silent,
    home,
  });
}

test('拓扑：任务只布置给直接下级，不跨层', async () => {
  const homeA = mkdtempSync(join(tmpdir(), 'cow-casc-a-'));
  const homeB = mkdtempSync(join(tmpdir(), 'cow-casc-b-'));
  const homeC = mkdtempSync(join(tmpdir(), 'cow-casc-c-'));
  const peersA = new PeerRegistry({ file: join(homeA, 'peers.json') });
  const peersB = new PeerRegistry({ file: join(homeB, 'peers.json') });
  const peersC = new PeerRegistry({ file: join(homeC, 'peers.json') });

  const instA = { instanceId: 'cow_aaaa', uuid: 'uuid-a', displayName: 'A', description: 'A', passwordSalt: 's', passwordHash: hashJoinPassword('pw', 's') };
  const instB = { instanceId: 'cow_bbbb', uuid: 'uuid-b', displayName: 'B', description: 'B', passwordSalt: 's', passwordHash: hashJoinPassword('pw', 's') };
  const instC = { instanceId: 'cow_cccc', uuid: 'uuid-c', displayName: 'C', description: 'C', passwordSalt: 's', passwordHash: hashJoinPassword('pw', 's') };

  let chA;
  let chB;
  let chC;
  const tasksA = new CowTasks({ channel: null, instance: instA, logger: silent });
  let tasksB;

  chA = makeChannel({
    home: homeA, instance: instA, peers: peersA,
    authorize: (password) => (password === 'pw' ? { kind: 'join', label: '' } : null),
    onEvent: ({ event }) => tasksA.onEvent({ event: event.type, payload: event.payload }),
  });
  tasksA.channel = chA;

  const serverA = await listen(chA);
  // B 连 A
  peersB.upsert({ url: serverA.url, token: 'pw', label: 'A', instanceId: 'cow_aaaa', relation: 'parent' });
  tasksB = new CowTasks({ channel: null, instance: instB, logger: silent });
  chB = makeChannel({
    home: homeB, instance: instB, peers: peersB,
    authorize: (password) => (password === 'pw' ? { kind: 'join', label: '' } : null),
    onEvent: ({ from, event }) => {
      if (event.type === 'task.offer') {
        chB.send(from, { type: 'task.claim', payload: { taskId: event.payload.taskId } });
        return;
      }
      // B 直接执行 A 下发的任务（不向自己的下级转发）。
      if (event.type === 'task.body') {
        chB.send(from, { type: 'task.result', payload: { taskId: event.payload.taskId, status: 'succeeded', summary: 'done at B' } });
      }
    },
  });
  tasksB.channel = chB;

  const serverB = await listen(chB);
  // C 连 B
  peersC.upsert({ url: serverB.url, token: 'pw', label: 'B', instanceId: 'cow_bbbb', relation: 'parent' });
  chC = makeChannel({
    home: homeC, instance: instC, peers: peersC,
    onEvent: ({ from, event }) => {
      if (event.type === 'task.offer') {
        chC.send(from, { type: 'task.claim', payload: { taskId: event.payload.taskId } });
        return;
      }
      if (event.type !== 'task.body') return;
      chC.send(from, { type: 'task.result', payload: { taskId: event.payload.taskId, status: 'succeeded', summary: 'done at C' } });
    },
  });

  chA.start();
  chB.start();
  chC.start();
  try {
    assert.ok(await waitFor(() => chB.connectedCount() >= 1 && chC.connectedCount() >= 1), 'WS 链路未建立');
    assert.ok(await waitFor(() => chA.status('B').state === 'connected'), 'A 未看到 B');
    // A 只认识直接下级 B，看不到 C（不跨层）。
    assert.notEqual(chA.status('C').state, 'connected');
    const created = tasksA.assign({ peer: 'B', prompt: 'cascade test', cwd: '' });
    assert.ok(await waitFor(() => tasksA.get(created.taskId)?.status === 'succeeded'), 'A 未收到 B 的结果');
    assert.equal(tasksA.get(created.taskId).summary, 'done at B');
  } finally {
    chA.stop();
    chB.stop();
    chC.stop();
    serverA.server.close();
    serverB.server.close();
  }
});
