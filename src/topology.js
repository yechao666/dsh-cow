/**
 * 下级拓扑采集（纯插件层，不经过任何智能体工具）。
 *
 * 方向约定：只沿「下级」方向展开，绝不向上调查。
 *   - 每个节点只登记自己的直接下级（peers.json 里 relation != 'parent'）。
 *   - 采集时向直接下级发 `topo.req`；下级用自己的下级继续递归，
 *     把子树放在 `topo.res` 里回传，因此上级永远不需要访问自己的上级。
 *
 * 本文件只做纯计算（整形、裁剪、展平、统计），传输在 channel.js。
 */

/** 采集默认值：深度、单跳超时、总节点上限。 */
export const TOPOLOGY_DEFAULTS = {
  depth: 3,
  timeoutMs: 900,
  maxNodes: 500,
  maxDepth: 8,
};

/** 单次请求最多携带多少个子节点描述，避免特大型机构一次撑爆消息。 */
export const MAX_CHILDREN_PER_NODE = 200;

export function resolveLimits(input = {}) {
  const depth = Number(input.depth);
  const timeoutMs = Number(input.timeoutMs);
  const maxNodes = Number(input.maxNodes);
  return {
    depth: Number.isFinite(depth) && depth >= 0
      ? Math.min(Math.floor(depth), TOPOLOGY_DEFAULTS.maxDepth)
      : TOPOLOGY_DEFAULTS.depth,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs >= 50
      ? Math.min(Math.floor(timeoutMs), 10_000)
      : TOPOLOGY_DEFAULTS.timeoutMs,
    maxNodes: Number.isFinite(maxNodes) && maxNodes > 0
      ? Math.min(Math.floor(maxNodes), 5000)
      : TOPOLOGY_DEFAULTS.maxNodes,
  };
}

/** 本节点描述：地图的根。 */
export function selfNode(instance = {}) {
  return {
    id: String(instance.peerId ?? ''),
    label: String(instance.displayName ?? '') || String(instance.peerId ?? ''),
    version: String(instance.version ?? ''),
    role: String(instance.role ?? 'leader'),
    department: String(instance.department ?? ''),
    owner: String(instance.owner ?? ''),
    depth: 0,
    online: true,
    direct: true,
    relation: 'self',
  };
}

/**
 * 一个直接下级节点：来自 peers.json 的登记 + 通道实时状态。
 * 断线的下级仍要出现在地图上（标 online=false），否则「所有下级」会缺人。
 */
export function childNode({ peer, status } = {}) {
  const node = status?.node ?? null;
  return {
    id: String(peer?.peerId ?? node?.uuid ?? peer?.label ?? ''),
    label: String(peer?.label ?? node?.displayName ?? ''),
    version: String(node?.version ?? peer?.version ?? ''),
    role: String(node?.role ?? (peer?.relation === 'peer' ? 'peer' : 'member')),
    relation: String(peer?.relation ?? 'child'),
    online: status?.state === 'connected',
    direct: true,
    description: String(node?.description ?? peer?.capabilitySummary ?? ''),
    department: String(node?.department ?? ''),
    owner: String(node?.owner ?? ''),
    proxyEnabled: node?.proxyEnabled === true,
    proxyViaParent: node?.proxyViaParent === true,
    url: String(peer?.url ?? ''),
    encrypted: status?.e2e === true,
  };
}

/**
 * 校验并裁剪从下级回传的子树：远端可能是旧版本、也可能被篡改。
 * 只保留允许的字段，超出节点上限的部分直接截断（truncated=true）。
 */
export function sanitizeSubtree(raw, { remaining = TOPOLOGY_DEFAULTS.maxNodes, depth = 0, maxDepth = TOPOLOGY_DEFAULTS.maxDepth, seen = new Set() } = {}) {
  const budget = { remaining, truncated: false };
  const walk = (input, level, parentId) => {
    if (!input || typeof input !== 'object') return null;
    if (budget.remaining <= 0 || level > maxDepth) {
      budget.truncated = true;
      return null;
    }
    const id = String(input.id ?? '');
    if (!id || seen.has(id)) return null; // 环路或重复节点：直接剪掉
    seen.add(id);
    budget.remaining -= 1;
    const node = {
      id,
      parentId,
      label: String(input.label ?? id).slice(0, 200),
      version: String(input.version ?? '').slice(0, 40),
      role: String(input.role ?? 'member').slice(0, 20),
      relation: String(input.relation ?? 'child').slice(0, 20),
      online: input.online !== false,
      direct: level === 1,
      depth: level,
      description: String(input.description ?? '').slice(0, 300),
      department: String(input.department ?? '').slice(0, 80),
      owner: String(input.owner ?? '').slice(0, 80),
      encrypted: input.encrypted === true,
      proxyEnabled: input.proxyEnabled === true,
      proxyViaParent: input.proxyViaParent === true,
      stale: input.stale === true,
      truncated: input.truncated === true,
      children: [],
    };
    const kids = Array.isArray(input.children) ? input.children.slice(0, MAX_CHILDREN_PER_NODE) : [];
    if (Array.isArray(input.children) && input.children.length > kids.length) budget.truncated = true;
    for (const kid of kids) {
      const child = walk(kid, level + 1, id);
      if (child) node.children.push(child);
    }
    return node;
  };
  const tree = walk(raw, depth, null);
  return { tree, truncated: budget.truncated, remaining: budget.remaining };
}

/** 展平成一维节点表 + 边，供前端直接画图。 */
export function flatten(root) {
  const nodes = [];
  const edges = [];
  if (!root) return { nodes, edges, stats: { total: 0, online: 0, offline: 0, direct: 0, depth: 0 } };
  const stack = [{ node: root, parentId: null, depth: 0 }];
  let depth = 0;
  while (stack.length) {
    const { node, parentId, depth: level } = stack.pop();
    const id = String(node.id ?? `anon_${nodes.length}`);
    nodes.push({
      id,
      parentId,
      label: String(node.label ?? id),
      version: String(node.version ?? ''),
      role: String(node.role ?? ''),
      relation: String(node.relation ?? ''),
      online: node.online !== false,
      direct: level === 1,
      depth: level,
      description: String(node.description ?? ''),
      department: String(node.department ?? ''),
      owner: String(node.owner ?? ''),
      encrypted: node.encrypted === true,
      proxyEnabled: node.proxyEnabled === true,
      proxyViaParent: node.proxyViaParent === true,
      stale: node.stale === true,
      truncated: node.truncated === true,
    });
    if (parentId) edges.push({ from: parentId, to: id, depth: level });
    depth = Math.max(depth, level);
    const children = Array.isArray(node.children) ? node.children : [];
    // 倒序入栈，保证输出顺序与树的书写顺序一致。
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], parentId: id, depth: level + 1 });
    }
  }
  const stats = {
    total: nodes.length,
    online: nodes.filter((node) => node.online && node.depth > 0).length,
    offline: nodes.filter((node) => !node.online && node.depth > 0).length,
    direct: nodes.filter((node) => node.depth === 1).length,
    depth,
  };
  return { nodes, edges, stats };
}

/** 采集结果统一出口：根节点 + 子树 + 展平数据 + 采集元信息。 */
export function buildMap({ self, children = [], meta = {} } = {}) {
  const root = { ...selfNode(self), children };
  const flat = flatten(root);
  return { root, ...flat, meta };
}
