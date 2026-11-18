import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TOPOLOGY_DEFAULTS,
  buildMap,
  childNode,
  flatten,
  resolveLimits,
  sanitizeSubtree,
  selfNode,
} from '../src/topology.js';

test('拓扑限制有默认值，并拒绝超深/超时', () => {
  assert.deepEqual(resolveLimits({}), {
    depth: TOPOLOGY_DEFAULTS.depth,
    timeoutMs: TOPOLOGY_DEFAULTS.timeoutMs,
    maxNodes: TOPOLOGY_DEFAULTS.maxNodes,
  });
  const limits = resolveLimits({ depth: 99, timeoutMs: 1, maxNodes: 99999 });
  assert.equal(limits.depth, TOPOLOGY_DEFAULTS.maxDepth);
  assert.equal(limits.timeoutMs, 900);
  assert.equal(limits.maxNodes, 5000);
});

test('sanitizeSubtree 裁剪字段、限制节点并去掉环路', () => {
  const raw = {
    id: 'root', children: [
      { id: 'a', label: 'A', children: [{ id: 'b', label: 'B' }] },
      { id: 'a', label: 'duplicate' },
    ],
  };
  const { tree, truncated } = sanitizeSubtree(raw, { remaining: 5, maxDepth: 3 });
  assert.equal(tree.id, 'root');
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].children[0].label, 'B');
  assert.equal(truncated, false);
});

test('flatten 输出节点、边和统计', () => {
  const root = {
    id: 'self', label: '本机', children: [
      { id: 'a', label: 'A', online: true, children: [{ id: 'b', label: 'B', online: false }] },
    ],
  };
  const flat = flatten(root);
  assert.deepEqual(flat.nodes.map((node) => node.id), ['self', 'a', 'b']);
  assert.equal(flat.edges.length, 2);
  assert.equal(flat.stats.total, 3);
  assert.equal(flat.stats.online, 1);
  assert.equal(flat.stats.offline, 1);
  assert.equal(flat.stats.direct, 1);
  assert.equal(flat.stats.depth, 2);
});

test('buildMap 把根、下级和 meta 放在一起', () => {
  const map = buildMap({
    self: { peerId: 'self', displayName: '本机', role: 'leader' },
    children: [{ id: 'a', label: 'A', online: false }],
    meta: { depth: 2 },
  });
  assert.equal(map.root.id, 'self');
  assert.equal(map.root.children[0].id, 'a');
  assert.equal(map.root.children[0].online, false);
  assert.equal(map.meta.depth, 2);
  assert.equal(map.stats.total, 2);
});
