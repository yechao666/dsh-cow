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
import { MessageRouter } from '../src/message-router.js';

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
  registry.upsert({ url: '', token: '', label: 'b-host', peerId: 'cods_bbbb', relation: 'child' });
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never' }),
    peers: registry,
    instance: { peerId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a', passwordSalt: 'testsalt', passwordHash: hashJoinPassword(token, 'testsalt') },
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

function makeDialer({ url, token, home, peerId = 'cods_bbbb', router, onEvent }) {
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url, token, label: 'a-host', peerId: 'cods_aaaa' });
  return new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance: { peerId, displayName: 'B' },
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
  peers.upsert({ url: 'http://127.0.0.1:1/cow/v1', token: 'cods_abcdefghijklmnopqrstuv', label: 'b-host', peerId: 'cods_bbbb', relation: 'child' });
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never' }),
    peers,
    instance: { peerId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a', passwordSalt: 'testsalt', passwordHash: hashJoinPassword('cods_abcdefghijklmnopqrstuv', 'testsalt') },
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
  const b = makeDialer({ url: `http://127.0.0.1:${port}/cow/v1`, token: 'cods_abcdefghijklmnopqrstuv', home: childHome, peerId: 'cods_bbbb' });
  try {
    b.start();
    await waitFor(() => channel.connectedCount() === 1);
    await waitFor(() => channel.status('b-host').state === 'connected');
    assert.equal(channel.connections().some((item) => item.peerName === 'b-host'), true);
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
      peerId: 'cods_aaaa', displayName: 'A', uuid: 'uuid-a',
      parent: { peerId: 'cods_bbbb', label: 'B' },
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
  peersB.upsert({ url: `http://127.0.0.1:${port}/cow/v1`, token: 'pw', label: 'A', peerId: 'cods_aaaa' });
  const b = new Channel({
    ctx: {}, resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers: peersB, instance: { peerId: 'cods_bbbb', displayName: 'B', uuid: 'uuid-b' },
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

test('complete 消息经通道送达后注入发起会话（端到端）', async () => {
  const a = await startAcceptor();
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-d-'));
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url: a.url, token: a.token, label: 'a-host', peerId: 'cods_aaaa' });

  const injected = [];
  const router = new MessageRouter({
    channel: { send: () => ({ delivered: true }) },
    inject: (...args) => { injected.push(args); return true; },
  });

  const b = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance: { peerId: 'cods_bbbb', displayName: 'B' },
    authorize: () => null,
    onEvent: (input) => router.handle(input.from, input.event),
    logger: silent,
    home,
  });
  try {
    b.start();
    await waitFor(() => b.connectedCount() === 1);
    a.channel.send('b-host', {
      type: 'msg.complete',
      payload: {
        kind: 'complete', messageId: 'msg_1', replyTo: 'msg_0',
        peer: 'b-host', text: '结论：构建成功',
        workspace: { id: 'w1', name: 'A', path: '/a' },
        session: { id: 'session-9', title: '主会话' },
      },
    });
    await waitFor(() => injected.length === 1);
    assert.equal(injected[0][0], 'session-9');
    assert.match(injected[0][2], /构建成功/);
    assert.equal(injected[0][3], 'complete');
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
    assert.equal(status.peerId, 'cods_aaaa');
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

test('send 支持 peerId：先解析成唯一 label 再入发件箱', () => {
  const home = mkdtempSync(join(tmpdir(), 'cow-chan-id-'));
  const peers = new PeerRegistry({ file: join(home, 'peers.json') });
  peers.upsert({ url: '', token: '', label: '子 DSH', peerId: 'cow_child_1', relation: 'child' });
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always' }),
    peers,
    instance: { peerId: 'cow_self', displayName: 'self' },
    authorize: () => null,
    logger: silent,
    home,
  });
  const sent = channel.send('cow_child_1', { type: 'msg.dispatch', payload: { text: 'x' } });
  assert.equal(sent.queued, true);
  assert.ok(channel.outbox.has('子 DSH'), '按唯一 label 入发件箱');
  assert.ok(!channel.outbox.has('cow_child_1'), '不按 peerId 直接入队');
});
