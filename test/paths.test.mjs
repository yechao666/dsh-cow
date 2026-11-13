import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isInside, normalizeRoot, normalizeRoots, resolveWorkspace } from '../src/paths.js';

function makeTree() {
  const base = mkdtempSync(join(tmpdir(), 'cow-paths-'));
  const root = join(base, 'workspace');
  const outside = join(base, 'outside');
  mkdirSync(join(root, 'sub'), { recursive: true });
  mkdirSync(outside, { recursive: true });
  writeFileSync(join(root, 'sub', 'a.txt'), 'a');
  writeFileSync(join(outside, 'secret.txt'), 's');
  return { base, root, outside };
}

test('normalizeRoots 支持换行与逗号分隔并去重', () => {
  const roots = normalizeRoots('/tmp/a\n/tmp/b, /tmp/a');
  assert.deepEqual(roots, ['/tmp/a', '/tmp/b']);
});

test('normalizeRoot 展开 ~', () => {
  const root = normalizeRoot('~');
  assert.ok(root && root.startsWith('/'));
  assert.equal(normalizeRoot('  '), null);
});

test('isInside 只认整段路径前缀', () => {
  assert.equal(isInside('/work', '/work/a'), true);
  assert.equal(isInside('/work', '/work'), true);
  assert.equal(isInside('/work', '/workshop/a'), false);
});

test('未配置 allowedRoots 时拒绝一切远端任务', () => {
  const outcome = resolveWorkspace('/whatever', []);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'no_roots');
});

test('根目录内的路径被接受，缺省时使用第一个根', () => {
  const { root } = makeTree();
  const inside = resolveWorkspace(join(root, 'sub'), [root]);
  assert.equal(inside.ok, true);
  // 存在目录会解析成真实路径（macOS 的 /var → /private/var）。
  assert.equal(inside.path, realpathSync(join(root, 'sub')));

  const fallback = resolveWorkspace('', [root]);
  assert.equal(fallback.ok, true);
  assert.equal(fallback.path, realpathSync(root));
});

test('越界路径被拒绝', () => {
  const { root, outside } = makeTree();
  const outsideOutcome = resolveWorkspace(outside, [root]);
  assert.equal(outsideOutcome.ok, false);
  assert.equal(outsideOutcome.reason, 'outside_roots');

  const escape = resolveWorkspace(join(root, '..', 'outside'), [root]);
  assert.equal(escape.ok, false);
  assert.equal(escape.reason, 'outside_roots');
});

test('根目录下不存在的新目录允许（Agent 会创建）', () => {
  const { root } = makeTree();
  const outcome = resolveWorkspace(join(root, 'new-dir', 'deeper'), [root]);
  assert.equal(outcome.ok, true);
});

test('符号链接不能把目标带到根目录之外', () => {
  const { base, root, outside } = makeTree();
  const link = join(root, 'link-out');
  try {
    symlinkSync(outside, link, 'dir');
  } catch {
    return; // 平台不支持符号链接时跳过
  }
  const outcome = resolveWorkspace(link, [root]);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.reason, 'outside_roots');
  rmSync(base, { recursive: true, force: true });
});
