import assert from 'node:assert/strict';
import test from 'node:test';
import {
  builtinCapabilities,
  detectCapabilities,
  matchPeers,
  mergeCapabilities,
  parseDeclared,
  parseProbes,
  summarizeCapabilities,
} from '../src/capabilities.js';

test('parseDeclared 解析 `id | 标题 | 标签 | 说明`', () => {
  const items = parseDeclared('intranet.pay | 支付内网 | intranet,pay | 只能访问支付内网\n\n# 注释\nxcode.release | 发版机 | ios,release | 装了签名证书');
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'intranet.pay');
  assert.deepEqual(items[0].tags, ['intranet', 'pay']);
  assert.equal(items[1].summary, '装了签名证书');
  assert.equal(items[0].kind, 'declared');
});

test('自由文本能力说明（一段话）也能解析并参与匹配', () => {
  const items = parseDeclared('这台机器有 A100 GPU，可以跑 cuda 训练\n另外装了 ffmpeg 做转码');
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 'declared.cap1');
  assert.equal(items[0].kind, 'declared');
  assert.match(items[0].title, /A100/);
  assert.ok(items[0].tags.includes('a100'));
  const ranked = matchPeers([{ label: 'gpu-box', capabilities: items }], 'gpu 训练');
  assert.ok(ranked[0].score > 0);
  assert.ok(ranked[0].matched.includes('declared.cap1'));
});

test('parseProbes 解析命令与参数', () => {
  const probes = parseProbes('tool.brew | Homebrew | brew,macos | brew --version');
  assert.equal(probes.length, 1);
  assert.equal(probes[0].command, 'brew');
  assert.deepEqual(probes[0].args, ['--version']);
  assert.deepEqual(probes[0].tags, ['brew', 'macos']);
});

test('mergeCapabilities 按 id 去重，后面的覆盖前面的', () => {
  const merged = mergeCapabilities({
    builtin: [{ id: 'os.darwin', title: 'darwin', tags: ['os'], available: true, kind: 'builtin' }],
    detected: [{ id: 'tool.docker', title: 'Docker', tags: ['docker'], available: true, kind: 'detected' }],
    declared: [{ id: 'tool.docker', title: 'Docker（自建镜像仓库）', tags: ['docker'], available: true, kind: 'declared' }],
  });
  assert.equal(merged.length, 2);
  assert.equal(merged.find((item) => item.id === 'tool.docker').kind, 'declared');
});

test('探测失败的能力标记为不可用并保留原因', async () => {
  const detected = await detectCapabilities({
    probes: [{ id: 'tool.nope', title: 'Nope', tags: ['nope'], command: 'nope', args: [] }],
    run: async () => ({ ok: false, detail: 'not installed' }),
  });
  assert.equal(detected[0].available, false);
  assert.equal(detected[0].detail, 'not installed');
});

test('builtinCapabilities 至少给出 os 与 arch', () => {
  const caps = builtinCapabilities({ platform: 'darwin', arch: 'arm64' });
  const ids = caps.map((item) => item.id);
  assert.ok(ids.includes('os.darwin'));
  assert.ok(ids.includes('arch.arm64'));
  assert.ok(ids.includes('gpu.apple'));
});

test('matchPeers 按能力标签排序并解释命中原因', () => {
  const peers = [
    {
      label: 'linux-gpu',
      capabilities: [
        { id: 'gpu.nvidia', title: 'NVIDIA GPU', tags: ['gpu', 'cuda'], available: true },
        { id: 'os.linux', title: 'linux', tags: ['os', 'linux'], available: true },
      ],
    },
    {
      label: 'mac-mini',
      capabilities: [
        { id: 'tool.xcodebuild', title: 'Xcode 命令行构建', tags: ['xcode', 'ios', 'build'], available: true },
        { id: 'os.darwin', title: 'darwin', tags: ['os', 'darwin'], available: true },
      ],
    },
  ];
  const byXcode = matchPeers(peers, '需要在 macOS 上用 xcode 构建 iOS 包');
  assert.equal(byXcode[0].peer, 'mac-mini');
  assert.ok(byXcode[0].matched.includes('tool.xcodebuild'));
  assert.match(byXcode[0].reason, /tool\.xcodebuild/);

  const byGpu = matchPeers(peers, 'cuda gpu 训练');
  assert.equal(byGpu[0].peer, 'linux-gpu');
});

test('不可用能力不参与匹配', () => {
  const peers = [{ label: 'a', capabilities: [{ id: 'gpu.nvidia', title: 'GPU', tags: ['gpu'], available: false }] }];
  const ranked = matchPeers(peers, 'gpu');
  assert.equal(ranked[0].score, 0);
  assert.deepEqual(ranked[0].matched, []);
});

test('summarizeCapabilities 只列可用项并截断', () => {
  const caps = [
    { id: 'a', available: true },
    { id: 'b', available: false },
    { id: 'c', available: true },
  ];
  assert.equal(summarizeCapabilities(caps), 'a, c');
});
