import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveConfig, DEFAULT_ALLOWED_ROOT } from '../src/config.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

test('maxFileMB 默认 50，可配置并夹在 1..1024 之间', () => {
  assert.equal(resolveConfig({}).maxFileMB, 50);
  assert.equal(resolveConfig({ maxFileMB: 200 }).maxFileMB, 200);
  assert.equal(resolveConfig({ maxFileMB: 0 }).maxFileMB, 1);
  assert.equal(resolveConfig({ maxFileMB: 5000 }).maxFileMB, 1024);
});

test('allowedRoots 默认/留空都回落到主目录下的 dsh-cow-root（跨平台由代码解析）', () => {
  assert.equal(DEFAULT_ALLOWED_ROOT, join(homedir(), 'dsh-cow-root'));
  assert.equal(DEFAULT_ALLOWED_ROOT.startsWith('~'), false);
  assert.equal(DEFAULT_ALLOWED_ROOT.endsWith('dsh-cow-root'), true);
  assert.equal(resolveConfig({}).allowedRoots, DEFAULT_ALLOWED_ROOT);
  assert.equal(resolveConfig({ allowedRoots: '   ' }).allowedRoots, DEFAULT_ALLOWED_ROOT);
  assert.equal(resolveConfig({ allowedRoots: '/tmp/other' }).allowedRoots, '/tmp/other');
});
