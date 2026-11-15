/**
 * 能力声明（capability document）。
 *
 * 设计要点：能力必须是「机器可判定」的结构化条目，而不是一段散文 ——
 * 本机 Agent 要据此决定「这个任务该派给哪台主机」。因此每条能力都有
 * 稳定的 id、标签、可用性和取证来源：
 *
 *   - builtin：从进程与系统信息直接得出（OS / CPU 架构 / GPU 类型）
 *   - detected：运行探测命令成功（docker / xcodebuild / nvidia-smi ...）
 *   - declared：人在设置页手写的业务能力（内网、异构算力、专用硬件…）
 */
import { execFile } from 'node:child_process';
import { arch as osArch, cpus, hostname, platform as osPlatform, release, totalmem } from 'node:os';

/** 默认探测项：能跑通就自动成为能力。 */
export const BUILTIN_PROBES = [
  {
    id: 'tool.docker',
    title: 'Docker',
    tags: ['docker', 'container', 'build'],
    command: 'docker',
    args: ['version', '--format', '{{.Server.Version}}'],
  },
  {
    id: 'tool.xcodebuild',
    title: 'Xcode 命令行构建',
    tags: ['xcode', 'ios', 'macos', 'build'],
    command: 'xcodebuild',
    args: ['-version'],
  },
  {
    id: 'tool.ffmpeg',
    title: 'FFmpeg',
    tags: ['ffmpeg', 'video', 'media'],
    command: 'ffmpeg',
    args: ['-version'],
  },
  {
    id: 'tool.python3',
    title: 'Python 3',
    tags: ['python', 'script'],
    command: 'python3',
    args: ['--version'],
  },
  {
    id: 'tool.git',
    title: 'Git',
    tags: ['git', 'vcs'],
    command: 'git',
    args: ['--version'],
  },
  {
    id: 'gpu.nvidia',
    title: 'NVIDIA GPU',
    tags: ['gpu', 'cuda', 'nvidia', 'ml'],
    command: 'nvidia-smi',
    args: ['--query-gpu=name,memory.total', '--format=csv,noheader'],
  },
];

function splitList(value) {
  return String(value ?? '')
    .split(/[,，\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseLines(input) {
  return String(input ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
}

/**
 * 设置页里的探测项：每行 `id | 标题 | 标签 | 命令`
 * 命令按空白切分为可执行文件 + 参数。
 */
export function parseProbes(text) {
  const probes = [];
  for (const line of parseLines(text)) {
    const [id, title, tags, command] = line.split('|').map((part) => part.trim());
    if (!id || !command) continue;
    const [bin, ...args] = command.split(/\s+/);
    if (!bin) continue;
    probes.push({
      id,
      title: title || id,
      tags: splitList(tags ?? id),
      command: bin,
      args,
    });
  }
  return probes;
}

function freeformTags(text) {
  const latin = String(text ?? '')
    .toLowerCase()
    .match(/[a-z][a-z0-9._-]{1,}/g) ?? [];
  return [...new Set(latin)].slice(0, 8);
}

/**
 * 设置页里的能力声明，两种写法都支持：
 *   - 结构化：`id | 标题 | 标签 | 说明`
 *   - 一段说明：整行自由文本（适合"这台机器能干什么"的自然语言描述）
 *
 * 自由文本会退化成一条 `declared.capN` 能力：标题即原文，标签取其中的英文关键词；
 * 匹配时标题本身也参与打分，所以中文描述同样能被 cow_match 命中。
 */
export function parseDeclared(text) {
  const items = [];
  for (const line of parseLines(text)) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length >= 3 && parts[0] && parts[1]) {
      const [id, title, tags, summary] = parts;
      items.push({
        id,
        title: title || id,
        tags: splitList(tags ?? id),
        summary: summary ?? '',
        kind: 'declared',
        available: true,
      });
      continue;
    }
    const title = line.trim().slice(0, 160);
    if (!title) continue;
    items.push({
      id: `declared.cap${items.length + 1}`,
      title,
      tags: freeformTags(title),
      summary: title,
      kind: 'declared',
      available: true,
      freeform: true,
    });
  }
  return items;
}

/** 默认探测执行器（可注入，便于测试）。 */
export function execProbe(command, args, timeoutMs) {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs, maxBuffer: 256 * 1024 }, (error, stdout) => {
      if (error) {
        resolve({ ok: false, detail: error.code === 'ENOENT' ? 'not installed' : String(error.message).slice(0, 200) });
        return;
      }
      const first = String(stdout ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)[0];
      resolve({ ok: true, detail: (first ?? 'available').slice(0, 200) });
    });
  });
}

/** 系统信息类能力：不需要探测命令，永远可用。 */
export function builtinCapabilities({ platform, arch, run } = {}) {
  const platformName = platform ?? osPlatform();
  const cpuArch = arch ?? osArch();
  const list = [
    {
      id: `os.${platformName}`,
      title: `${platformName} 主机`,
      tags: ['os', platformName],
      kind: 'builtin',
      available: true,
      detail: `${platformName} ${release()}`,
    },
    {
      id: `arch.${cpuArch}`,
      title: `${cpuArch} 架构`,
      tags: ['arch', cpuArch],
      kind: 'builtin',
      available: true,
      detail: `${cpus().length} 核 / ${Math.round(totalmem() / 1024 ** 3)} GB`,
    },
  ];
  if (platformName === 'darwin' && cpuArch === 'arm64') {
    list.push({
      id: 'gpu.apple',
      title: 'Apple Silicon GPU（Metal/MPS）',
      tags: ['gpu', 'metal', 'mps', 'apple', 'ml'],
      kind: 'builtin',
      available: true,
      detail: 'Apple Silicon 统一内存，可直接跑 MPS 推理',
    });
  }
  if (run?.hostname) list.push({ id: 'net.lan-reachable', title: '内网可达', tags: ['network'], kind: 'builtin', available: true, detail: '' });
  return list;
}

/**
 * 运行全部探测；单个探测失败不影响其它探测。
 * @param {{probes?: object[], run?: Function, timeoutMs?: number, concurrency?: number}} options
 */
export async function detectCapabilities({ probes = BUILTIN_PROBES, run = execProbe, timeoutMs = 2500 } = {}) {
  const results = await Promise.all(
    probes.map(async (probe) => {
      const outcome = await run(probe.command, probe.args ?? [], timeoutMs);
      return {
        id: probe.id,
        title: probe.title ?? probe.id,
        tags: probe.tags?.length ? probe.tags : [probe.id],
        kind: 'detected',
        available: outcome.ok === true,
        detail: outcome.detail ?? '',
      };
    }),
  );
  return results;
}

/**
 * 合成最终能力清单：builtin + detected + declared，按 id 去重（后者覆盖前者）。
 */
export function mergeCapabilities({ builtin = [], detected = [], declared = [] } = {}) {
  const byId = new Map();
  for (const item of [...builtin, ...detected, ...declared]) {
    if (!item?.id) continue;
    byId.set(item.id, { ...item, tags: item.tags?.length ? item.tags : [item.id] });
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** 给系统提示用的能力摘要（只列可用项）。 */
export function summarizeCapabilities(capabilities, limit = 12) {
  const available = capabilities.filter((item) => item.available !== false);
  const shown = available.slice(0, limit).map((item) => item.id);
  const more = available.length > shown.length ? ` 等 ${available.length} 项` : '';
  return `${shown.join(', ')}${more}`;
}

/** 能力文档中的 capability 摘要数组（与单条能力同构，便于对端直接展示）。 */
export function capabilityDigest(capabilities) {
  return capabilities.map(({ id, title, tags, kind, available, detail }) => ({ id, title, tags, kind, available, detail }));
}

function tokensOf(text) {
  const lowered = String(text ?? '').toLowerCase();
  const latin = lowered.match(/[a-z0-9][a-z0-9._-]{1,}/g) ?? [];
  const cjk = lowered.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  return [...new Set([...latin, ...cjk])];
}

/**
 * 给「需求」和「能力」打分。规则刻意简单可解释：
 *   - 标签命中 +3，能力 id 命中 +4，标题/说明包含 +2
 *   - 需求里出现 os/arch 关键词同样计入
 */
export function scoreCapability(capability, tokens) {
  if (!capability) return { score: 0, hits: [] };
  const tags = (capability.tags ?? []).map((tag) => String(tag).toLowerCase());
  const haystack = [capability.id, capability.title, capability.summary, capability.detail, ...tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let score = 0;
  const hits = [];
  for (const token of tokens) {
    if (!token) continue;
    if (tags.includes(token)) {
      score += 3;
      hits.push(token);
      continue;
    }
    if (String(capability.id).toLowerCase().includes(token)) {
      score += 4;
      hits.push(token);
      continue;
    }
    if (haystack.includes(token)) {
      score += 2;
      hits.push(token);
    }
  }
  return { score, hits: [...new Set(hits)] };
}

/**
 * 在已登记的 peer 中按需求排序。
 * @param {Array<{label: string, capabilities?: object[]}>} peers
 * @param {string} requirement
 */
export function matchPeers(peers, requirement) {
  const tokens = tokensOf(requirement);
  const ranked = peers.map((peer) => {
    const label = String(peer.label ?? '').toLowerCase();
    let score = 0;
    const matched = [];
    const reasons = [];
    if (label) {
      for (const token of tokens) {
        if (label.includes(token)) {
          score += 1;
          reasons.push(`主机名命中 ${token}`);
        }
      }
    }
    for (const capability of peer.capabilities ?? []) {
      if (capability?.available === false) continue;
      const outcome = scoreCapability(capability, tokens);
      if (outcome.score <= 0) continue;
      score += outcome.score;
      matched.push(capability.id);
      reasons.push(`${capability.id} 命中 ${outcome.hits.join('/')}`);
    }
    return {
      peer: peer.label,
      peerId: peer.peerId ?? '',
      score,
      matched: [...new Set(matched)],
      reason: reasons.slice(0, 5).join('；'),
    };
  });
  return ranked.sort((a, b) => b.score - a.score || String(a.peer).localeCompare(String(b.peer)));
}

/** 组装对外公布的实例文档。 */
export function buildInstanceDocument({
  identity,
  displayName,
  capabilities,
  workspaces,
  limits,
  model,
  protocol,
  uptimeSec,
  org,
  capabilitySummary,
}) {
  return {
    schema: protocol,
    peerId: identity.peerId,
    displayName: displayName || identity.displayName || hostname(),
    hostname: hostname(),
    platform: { os: osPlatform(), arch: osArch(), release: release(), hostname: hostname() },
    dsh: { node: process.versions.node, uptimeSec: Math.round(uptimeSec ?? 0) },
    capabilities: capabilityDigest(capabilities),
    capabilitySummary: String(capabilitySummary ?? ''),
    workspaces,
    model: model ?? null,
    limits,
    org: org ?? null,
    updatedAt: new Date().toISOString(),
  };
}
