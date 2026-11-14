import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveChildCwd, sessionInfo } from '../src/session-info.js';

test('sessionInfo 从 workspace 注册表与会话标题取信封字段', () => {
  const session = { id: 's1', header: { cwd: '/work/proj' } };
  const ctx = {
    get: (name) => {
      if (name === 'workspaceRegistry') {
        return { list: () => [{ id: 'w1', title: 'Proj', path: '/work/proj', sessionIds: ['s1'] }] };
      }
      if (name === 'sessionTitle') return { get: () => ({ title: '主会话' }) };
      return null;
    },
  };
  const info = sessionInfo(ctx, session);
  assert.deepEqual(info.workspace, { id: 'w1', name: 'Proj', path: '/work/proj' });
  assert.deepEqual(info.session, { id: 's1', title: '主会话' });
});

test('sessionInfo 在缺少服务时回落到会话 cwd', () => {
  const info = sessionInfo({ get: () => null }, { id: 's2', header: { cwd: '/work/other' } });
  assert.equal(info.workspace.id, '/work/other');
  assert.equal(info.workspace.name, 'other');
  assert.equal(info.workspace.path, '/work/other');
});

test('resolveChildCwd 只允许 allowedRoots 内路径', () => {
  const root = mkdtempSync(join(tmpdir(), 'cow-cwd-'));
  assert.equal(resolveChildCwd({ workspace: { path: join(root, 'a') }, roots: [root] }), join(root, 'a'));
  const outside = resolveChildCwd({ workspace: { path: '/etc', name: 'proj' }, roots: [root] });
  assert.equal(outside, join(root, 'proj'));
  // 工作区名与根目录同名时直接用根目录，避免 workspace/workspace 嵌套。
  const same = resolveChildCwd({ workspace: { path: '/etc', name: root.split('/').pop() }, roots: [root] });
  assert.equal(same, root);
  assert.throws(() => resolveChildCwd({ workspace: {}, roots: [] }), /allowedRoots/);
});
