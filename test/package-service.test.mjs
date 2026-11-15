import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createPackageService } from '../src/package-service.js';
import { buildPluginTarball, readPackageJsonFromTarball } from '../src/tarball.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('插件包：生成短期下载 token，sha256/版本可校验', () => {
  let now = 1_000_000;
  const service = createPackageService({
    root,
    pkg: { name: 'dsh-cow', version: '1.31.0-test' },
    baseUrl: 'http://main:60001/cow/v1',
    now: () => now,
    ttlMs: 30_000,
    logger: { info() {} },
  });
  const issued = service.issue();
  assert.equal(issued.version, '1.31.0-test');
  assert.match(issued.url, /^http:\/\/main:60001\/cow\/v1\/plugin\/package\?token=[0-9a-f]+$/);
  assert.match(issued.sha256, /^[0-9a-f]{64}$/);
  const token = new URL(issued.url).searchParams.get('token');
  const item = service.download(token);
  assert.ok(item?.buffer?.length > 0);
  assert.equal(item.sha256, issued.sha256);
  assert.equal(item.filename, 'dsh-cow-1.31.0-test.tgz');
  assert.equal(service.download('bad-token'), null);
  now += 30_001;
  assert.equal(service.download(token), null);
});

test('插件包：没有可达地址时明确报错', () => {
  const service = createPackageService({
    root,
    pkg: { name: 'dsh-cow', version: '1.31.0-test' },
    baseUrl: '',
    logger: { info() {} },
  });
  assert.throws(() => service.issue(), /HTTP 地址/);
});

test('插件包 manifest 可从 tgz 读取，用于升级前校验', () => {
  const buffer = buildPluginTarball(root, { name: 'dsh-cow', version: '1.31.1-test' });
  const manifest = readPackageJsonFromTarball(buffer);
  assert.equal(manifest.name, 'dsh-cow');
  assert.match(String(manifest.version), /^1\.31\./);
});
