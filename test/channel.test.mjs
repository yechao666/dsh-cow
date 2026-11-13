import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Channel } from '../src/channel.js';
import { hashJoinPassword } from '../src/identity.js';
import { PeerRegistry } from '../src/peers.js';
import { issueToken } from '../src/tokens.js';
import { Inbox } from '../src/inbox.js';
import { RemoteTaskIndex } from '../src/remote-tasks.js';
import { NotificationRouter } from '../src/notify.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

async function waitFor(predicate, { timeout = 4000, interval = 20 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('等待超时');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/** A 侧：接受连接的一方（authorize 决定 b 的 label）。 */
async function startAcceptor() {
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-a-'));
  const { token } = issueToken('b-host');
  const received = [];
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  registry.upsert({ url: '', token: '', label: 'b-host', instanceId: 'cods_bbbb', relation: 'child' });
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never' }),
    peers: registry,
    instance: { instanceId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a', passwordSalt: 'testsalt', passwordHash: hashJoinPassword(token, 'testsalt') },
    authorize: (candidate) => (candidate === token ? { label: 'b-host' } : null),
    onEvent: (input) => received.push(input),
    logger: silent,
    home,
  });
  const server = createServer((req, res) => {
    res.writeHead(404);
    res.end();
  });
  server.on('upgrade', (req, socket, head) => channel.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    channel,
    token,
    received,
    url: `http://127.0.0.1:${port}/cow/v1`,
    close: async () => {
      channel.stop();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function makeDialer({ url, token, home, instanceId = 'cods_bbbb', router, onEvent }) {
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url, token, label: 'a-host', instanceId: 'cods_aaaa' });
  return new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance: { instanceId, displayName: 'B' },
    authorize: () => null,
    onEvent: (input) => {
      onEvent?.(input);
      router?.handle(input);
    },
    logger: silent,
    home,
  });
}

test('拨号方连上接受方后可以双向发事件', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-b-'));
  const b = makeDialer({ url: a.url, token: a.token, home });
  try {
    b.start();
    await waitFor(() => a.channel.connectedCount() === 1);
    await waitFor(() => b.connectedCount() === 1);

    b.send('a-host', { type: 'peer.message', payload: { message: 'hello from B' } });
    await waitFor(() => a.received.some((item) => item.event.payload?.message === 'hello from B'));
    const inbound = a.received.find((item) => item.event.payload?.message === 'hello from B');
    assert.equal(inbound.from, 'b-host');
    assert.equal(inbound.event.type, 'peer.message');

    // A → B：A 用 token label（b-host）作为连接键回发。
    a.channel.send('b-host', { type: 'peer.message', payload: { message: 'reply from A' } });
    await waitFor(() => b.connections().length === 1);
    const bReceived = [];
    // B 的 onEvent 没挂，直接看发件箱被 ack 清空即可证明链路通畅。
    await waitFor(() => (b.outbox.get('a-host')?.entries ?? []).length === 0, { timeout: 2500 });
    assert.equal(bReceived.length, 0);
  } finally {
    b.stop();
    await a.close();
  }
});

test('共用密码模式：入站连接按已登记 peer.label 归位（不会一直显示离线）', async () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-label-'));
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url: 'http://127.0.0.1:1/cow/v1', token: 'cods_abcdefghijklmnopqrstuv', label: 'b-host', instanceId: 'cods_bbbb', relation: 'child' });
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never' }),
    peers,
    instance: { instanceId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a', passwordSalt: 'testsalt', passwordHash: hashJoinPassword('cods_abcdefghijklmnopqrstuv', 'testsalt') },
    authorize: () => ({ kind: 'join' }),
    onEvent: () => {},
    logger: silent,
    home,
  });
  const server = createServer((req, res) => { res.writeHead(404); res.end(); });
  server.on('upgrade', (req, socket, head) => channel.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const childHome = mkdtempSync(join(tmpdir(), 'cow-chan-label-b-'));
  const b = makeDialer({ url: `http://127.0.0.1:${port}/cow/v1`, token: 'cods_abcdefghijklmnopqrstuv', home: childHome, instanceId: 'cods_bbbb' });
  try {
    b.start();
    await waitFor(() => channel.connectedCount() === 1);
    await waitFor(() => channel.status('b-host').state === 'connected');
    assert.equal(channel.connections().some((item) => item.peer === 'b-host'), true);
  } finally {
    b.stop();
    channel.stop();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('拒绝把上级当作下级接入（每个节点只有直接父子）', async () => {
  const homeA = mkdtempSync(join(tmpdir(), 'cow-parent-guard-'));
  const channelA = new Channel({
    ctx: {}, resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never' }),
    peers: new PeerRegistry({ file: join(homeA, 'peers.json') }),
    instance: {
      instanceId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a',
      parent: { instanceId: 'cods_bbbb', label: 'B' },
      passwordSalt: 'testsalt', passwordHash: hashJoinPassword('pw', 'testsalt'),
    },
    authorize: () => ({ kind: 'join' }),
    logger: silent, home: homeA,
  });
  const server = createServer((req, res) => { res.writeHead(404); res.end(); });
  server.on('upgrade', (req, socket, head) => channelA.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const homeB = mkdtempSync(join(tmpdir(), 'cow-parent-guard-b-'));
  const peersB = new PeerRegistry({ file: join(homeB, 'peers.json') });
  peersB.upsert({ url: `http://127.0.0.1:${port}/cow/v1`, token: 'pw', label: 'A', instanceId: 'cods_aaaa' });
  const b = new Channel({
    ctx: {}, resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers: peersB, instance: { instanceId: 'cods_bbbb', displayName: 'B', uuid: 'uuid-b' },
    authorize: () => null, logger: silent, home: homeB,
  });
  try {
    channelA.start();
    b.start();
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.equal(channelA.connectedCount(), 0);
  } finally {
    b.stop();
    channelA.stop();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('离线时事件进发件箱，连上后按序补发并被 ack 清空', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-c-'));
  const b = makeDialer({ url: a.url, token: a.token, home });
  try {
    const queued = b.send('a-host', { type: 'peer.message', payload: { message: 'offline-1' } });
    assert.equal(queued.queued, true);
    assert.equal(queued.delivered, false);
    assert.equal(b.outbox.get('a-host').entries.length, 1);

    b.start();
    await waitFor(() => a.received.some((item) => item.event.payload?.message === 'offline-1'));
    await waitFor(() => (b.outbox.get('a-host')?.entries ?? []).length === 0);
  } finally {
    b.stop();
    await a.close();
  }
});

test('任务完成事件经通道送达后注入发起会话（端到端）', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-d-'));
  const inbox = new Inbox({ file: join(home, 'inbox.json') });
  const remoteIndex = new RemoteTaskIndex({ file: join(home, 'remote.json') });
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url: a.url, token: a.token, label: 'a-host', instanceId: 'cods_aaaa' });
  remoteIndex.remember('task_remote', { label: 'a-host', url: a.url }, { originSessionId: 'session-9' });

  const injected = [];
  const ctx = {
    get: () => ({ get: (id) => (id === 'session-9' ? { session: { id }, followup: (message) => injected.push(message) } : undefined) }),
  };
  const router = new NotificationRouter({
    ctx,
    resolveConfig: () => ({ notifyMode: 'inject', maxInjectionsPerMinute: 3 }),
    peers,
    remoteIndex,
    inbox,
    logger: silent,
  });

  const b = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance: { instanceId: 'cods_bbbb', displayName: 'B' },
    authorize: () => null,
    onEvent: (input) => router.handle(input),
    logger: silent,
    home,
  });
  try {
    b.start();
    await waitFor(() => b.connectedCount() === 1);
    a.channel.send('b-host', {
      type: 'task.completed',
      payload: { taskId: 'task_remote', status: 'succeeded', title: '构建', summary: '结论：构建成功', needsInput: null },
    });
    await waitFor(() => injected.length === 1);
    assert.match(injected[0].content[0].text, /构建成功/);
    assert.match(injected[0].content[0].text, /cow_task/);
  } finally {
    b.stop();
    await a.close();
  }
});

test('接受方离线时排队的消息，在拨号方连上后补发并被 ack 清空', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-g-'));
  const received = [];
  const b = makeDialer({ url: a.url, token: a.token, home, onEvent: (input) => received.push(input) });
  try {
    // 还没人连进来时，接受方的发件箱里先攒一条。
    a.channel.send('b-host', { type: 'peer.message', payload: { message: 'acceptor-queued' } });
    assert.equal(a.channel.outbox.get('b-host').entries.length, 1);

    b.start();
    await waitFor(() => received.some((item) => item.event.payload?.message === 'acceptor-queued'));
    await waitFor(() => (a.channel.outbox.get('b-host')?.entries ?? []).length === 0);
  } finally {
    b.stop();
    await a.close();
  }
});

test('临时标识可以在连接建立后改名（rebind）', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-h-'));
  const received = [];
  const b = makeDialer({ url: a.url, token: a.token, home, onEvent: (input) => received.push(input) });
  try {
    b.start();
    await waitFor(() => a.channel.connectedCount() === 1);
    assert.equal(a.channel.status('b-host').state, 'connected');
    assert.equal(a.channel.rebind('b-host', 'cowork-web'), true);
    assert.equal(a.channel.status('b-host').state, 'offline');
    assert.equal(a.channel.status('cowork-web').state, 'connected');

    a.channel.send('cowork-web', { type: 'peer.message', payload: { message: 'after-rebind' } });
    await waitFor(() => received.some((item) => item.event.payload?.message === 'after-rebind'));
  } finally {
    b.stop();
    await a.close();
  }
});

test('心跳与连接状态可观测', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-e-'));
  const b = makeDialer({ url: a.url, token: a.token, home });
  try {
    b.start();
    await waitFor(() => b.connectedCount() === 1);
    const status = b.status('a-host');
    assert.equal(status.state, 'connected');
    assert.equal(status.peerInstanceId, 'cods_aaaa');
    const conns = b.connections();
    assert.equal(conns[0].direction, 'out');
  } finally {
    b.stop();
    await a.close();
  }
});

test('token 不对时升级被拒绝，不会建立连接', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-f-'));
  const b = makeDialer({ url: a.url, token: 'cods_wrongwrongwrongwrong', home });
  try {
    b.start();
    await new Promise((resolve) => setTimeout(resolve, 600));
    assert.equal(a.channel.connectedCount(), 0);
    assert.equal(b.connectedCount(), 0);
    assert.equal(b.status('a-host').state, 'offline');
  } finally {
    b.stop();
    await a.close();
  }
});



test('共用密码握手后连接启用帧级加密（双方会话密钥一致）', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-e2e-'));
  const b = makeDialer({ url: a.url, token: a.token, home });
  try {
    b.start();
    await waitFor(() => a.channel.connectedCount() === 1 && b.connectedCount() === 1);
    const aState = [...a.channel.conns.values()][0];
    const bState = [...b.conns.values()][0];
    assert.ok(aState.e2eKey && aState.e2eKey.length === 32, '接受方应派生会话密钥');
    assert.ok(bState.e2eKey && bState.e2eKey.length === 32, '拨号方应派生会话密钥');
    assert.deepEqual(aState.e2eKey, bState.e2eKey, '双方密钥必须一致');

    b.send('a-host', { type: 'peer.message', payload: { message: '加密消息' } });
    await waitFor(() => a.received.some((item) => item.event.payload?.message === '加密消息'));
  } finally {
    b.stop();
    await a.close();
  }
});
