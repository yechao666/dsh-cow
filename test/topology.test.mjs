import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Channel } from '../src/channel.js';
import { hashJoinPassword } from '../src/identity.js';
import { PeerRegistry } from '../src/peers.js';
import { createAdminHandlers } from '../src/admin-api.js';
import {
  TOPOLOGY_DEFAULTS,
  buildMap,
  childNode,
  flatten,
  resolveLimits,
  sanitizeSubtree,
  selfNode,
} from '../src/topology.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

async function waitFor(predicate, { timeout = 6000, interval = 20 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('等待超时');
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

function memoTree() {
  return {
    id: 'cow_child',
    label: '子 B',
    version: '1.31.11',
    role: 'member',
    online: true,
    children: [
      {
        id: 'cow_grand',
        label: '孙 C',
        version: '1.30.0',
        online: false,
        children: [],
      },
    ],
  };
}

test('resolveLimits 把越界参数钳到安全范围', () => {
  assert.deepEqual(resolveLimits(), {
    depth: TOPOLOGY_DEFAULTS.depth,
    timeoutMs: TOPOLOGY_DEFAULTS.timeoutMs,
    maxNodes: TOPOLOGY_DEFAULTS.maxNodes,
  });
  assert.equal(resolveLimits({ depth: 99 }).depth, TOPOLOGY_DEFAULTS.maxDepth);
  assert.equal(resolveLimits({ depth: -3 }).depth, TOPOLOGY_DEFAULTS.depth);
  assert.equal(resolveLimits({ timeoutMs: 5 }).timeoutMs, TOPOLOGY_DEFAULTS.timeoutMs);
  assert.equal(resolveLimits({ maxNodes: 0 }).maxNodes, TOPOLOGY_DEFAULTS.maxNodes);
  // 表单里传进来的是字符串，也要能解析。
  assert.equal(resolveLimits({ depth: '2' }).depth, 2);
});

test('flatten 输出节点、边与统计', () => {
  const tree = {
    ...selfNode({ peerId: 'cow_self', displayName: '主 DSH', role: 'leader' }),
    children: [memoTree()],
  };
  const { nodes, edges, stats } = flatten(tree);
  assert.equal(nodes.length, 3);
  assert.equal(edges.length, 2);
  assert.equal(stats.direct, 1);
  assert.equal(stats.depth, 2);
  assert.equal(stats.online, 1, '只统计下级，根节点不算');
  assert.equal(stats.offline, 1);
  assert.deepEqual(
    nodes.map((node) => node.id),
    ['cow_self', 'cow_child', 'cow_grand'],
  );
  assert.deepEqual(edges.map((edge) => `${edge.from}->${edge.to}`), ['cow_self->cow_child', 'cow_child->cow_grand']);
  const grand = nodes.find((node) => node.id === 'cow_grand');
  assert.equal(grand.depth, 2);
  assert.equal(grand.online, false);
});

test('sanitizeSubtree 剪掉环路，并限制节点预算', () => {
  const cyclic = {
    id: 'cow_a',
    children: [
      { id: 'cow_b', children: [{ id: 'cow_a', children: [] }] },
    ],
  };
  const first = sanitizeSubtree(cyclic, { remaining: 100 });
  assert.equal(first.tree.id, 'cow_a');
  assert.equal(first.tree.children[0].id, 'cow_b');
  assert.equal(first.tree.children[0].children.length, 0, '指回祖先的节点必须被剪掉');
  assert.equal(first.truncated, false);

  const wide = { id: 'cow_root', children: Array.from({ length: 10 }, (_, index) => ({ id: `cow_${index}`, children: [] })) };
  const limited = sanitizeSubtree(wide, { remaining: 4 });
  assert.equal(limited.truncated, true);
  assert.ok(flatten(limited.tree).nodes.length <= 4);
});

test('childNode：断线的下级仍然保留（标记 online=false）', () => {
  const node = childNode({
    peer: { label: '子 B', peerId: 'cow_b', relation: 'child' },
    status: { state: 'offline' },
  });
  assert.equal(node.id, 'cow_b');
  assert.equal(node.online, false);
  assert.equal(node.direct, true);

  const online = childNode({
    peer: { label: '子 C', peerId: 'cow_c', relation: 'child' },
    status: { state: 'connected', e2e: true, node: { version: '1.31.11', role: 'member' } },
  });
  assert.equal(online.online, true);
  assert.equal(online.encrypted, true);
  assert.equal(online.version, '1.31.11');
});

test('buildMap 把根节点与子树组装成可直接画图的结构', () => {
  const map = buildMap({
    self: { peerId: 'cow_self', displayName: '主 DSH', version: '1.31.11' },
    children: [memoTree()],
    meta: { elapsedMs: 12 },
  });
  assert.equal(map.root.id, 'cow_self');
  assert.equal(map.stats.total, 3);
  assert.equal(map.meta.elapsedMs, 12);
  assert.equal(map.nodes.length, map.stats.total);
});

test('GET /api/cow/topology 走插件层采集，不碰任何智能体工具', async () => {
  const map = buildMap({
    self: { peerId: 'cow_self', displayName: '主 DSH' },
    children: [memoTree()],
    meta: { depth: 3 },
  });
  let called = null;
  const handlers = createAdminHandlers({
    instance: { peerId: 'cow_self', displayName: '主 DSH', uuid: 'u1', role: 'leader' },
    resolveConfig: () => ({ displayName: '主 DSH' }),
    peers: { list: () => [], remove() {} },
    channel: {
      connections: () => [],
      status: () => ({ state: 'offline' }),
      collectDownstream: async (input) => {
        called = input;
        return map;
      },
    },
    router: { pending: () => [], answer: () => ({}) },
    activity: { list: () => [] },
    passwordConfigured: () => false,
    getParentPassword: () => '',
  });
  const res = {
    status: 0,
    writeHead(status) { this.status = status; },
    end(body) { this.body = body; },
  };
  await handlers['/api/cow/topology']({ method: 'GET', url: '/api/cow/topology?depth=2&timeoutMs=500' }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.status, 200);
  assert.equal(body.stats.total, 3);
  assert.equal(body.root.id, 'cow_self');
  assert.deepEqual(called, { depth: '2', timeoutMs: '500', maxNodes: undefined });
});

// ── 集成：A ← B ← C，A 采集时应该看到孙节点 C ──────────────────

async function startNode({ peerId, displayName, token, peerSpecs = [], dial = 'never', prefix }) {
  const home = mkdtempSync(join(tmpdir(), prefix));
  const registry = new PeerRegistry({ file: join(home, 'peers.json') });
  for (const spec of peerSpecs) registry.upsert(spec);
  const channel = new Channel({
    ctx: {},
    resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: dial }),
    peers: registry,
    instance: {
      peerId,
      displayName,
      uuid: `uuid-${peerId}`,
      passwordSalt: token ? 'testsalt' : undefined,
      passwordHash: token ? hashJoinPassword(token, 'testsalt') : undefined,
    },
    authorize: (candidate) => (token && candidate === token ? { kind: 'join' } : null),
    onEvent: () => {},
    logger: silent,
    home,
  });
  const server = createServer((req, res) => { res.writeHead(404); res.end(); });
  server.on('upgrade', (req, socket, head) => channel.handleUpgrade(req, socket, head));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    channel,
    url: `http://127.0.0.1:${port}/cow/v1`,
    close: async () => {
      channel.stop();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

test('A 采集下级地图：穿过 B 拿到孙节点 C，且不会向上访问', async () => {
  const tokenA = 'cods_aaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const tokenB = 'cods_bbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  const a = await startNode({
    peerId: 'cods_aaaa',
    displayName: 'A',
    token: tokenA,
    peerSpecs: [{ url: '', label: 'b-host', peerId: 'cods_bbbb', relation: 'child' }],
    prefix: 'cow-topo-a-',
  });
  const b = await startNode({
    peerId: 'cods_bbbb',
    displayName: 'B',
    token: tokenB,
    peerSpecs: [
      { url: a.url, token: tokenA, label: 'a-host', peerId: 'cods_aaaa', relation: 'parent' },
      { url: '', label: 'c-host', peerId: 'cods_cccc', relation: 'child' },
    ],
    dial: 'always',
    prefix: 'cow-topo-b-',
  });
  const c = await startNode({
    peerId: 'cods_cccc',
    displayName: 'C',
    peerSpecs: [{ url: b.url, token: tokenB, label: 'b-host', peerId: 'cods_bbbb', relation: 'parent' }],
    dial: 'always',
    prefix: 'cow-topo-c-',
  });
  try {
    b.channel.start();
    c.channel.start();
    await waitFor(() => a.channel.connectedCount() === 1);
    await waitFor(() => b.channel.connectedCount() === 2, { timeout: 8000 });
    await waitFor(() => c.channel.connectedCount() === 1);

    const map = await a.channel.collectDownstream({ depth: 3, timeoutMs: 1500 });
    const ids = map.nodes.map((node) => node.id);
    assert.ok(ids.includes('cods_bbbb'), `地图应含直接下级 B，实际：${ids.join(',')}`);
    assert.ok(ids.includes('cods_cccc'), `地图应含孙节点 C，实际：${ids.join(',')}`);
    assert.equal(map.nodes.find((node) => node.id === 'cods_cccc').depth, 2);
    assert.equal(map.stats.direct, 1);
    assert.equal(map.meta.truncated, false);

    // 只向下：A 的地图里不该出现 A 自己的上级，也不该出现反向边。
    assert.ok(!map.edges.some((edge) => edge.from === 'cods_cccc' && edge.to === 'cods_bbbb'));
    assert.equal(map.root.id, 'cods_aaaa');
  } finally {
    c.channel.stop();
    b.channel.stop();
    a.channel.stop();
    await c.close();
    await b.close();
    await a.close();
  }
});
