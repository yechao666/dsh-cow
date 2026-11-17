import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { createPackageService } from '../src/package-service.js';
import { buildPluginTarball, readPackageJsonFromTarball } from '../src/tarball.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('插件包：公开下载地址不带 token，sha256/版本可校验', () => {
  const service = createPackageService({
    root,
    pkg: { name: 'dsh-cow', version: '1.31.3-test' },
    baseUrl: 'http://main:60001/cow/v1',
    logger: { info() {} },
  });
  const issued = service.issue();
  assert.equal(issued.version, '1.31.3-test');
  assert.equal(issued.url, 'http://main:60001/cow/v1/plugin/package');
  assert.equal(issued.buffer, undefined, '升级消息里不能携带整包 buffer');
  assert.equal(service.issue({ base: 'http://192.168.1.10:60001/cow/v1' }).url, 'http://192.168.1.10:60001/cow/v1/plugin/package');
  assert.match(issued.sha256, /^[0-9a-f]{64}$/);
  const item = service.download();
  assert.ok(item.buffer.length > 0);
  assert.equal(item.sha256, issued.sha256);
  assert.equal(item.filename, 'dsh-cow-1.31.3-test.tgz');
});

test('插件包：没有可达地址时明确报错', () => {
  const service = createPackageService({
    root,
    pkg: { name: 'dsh-cow', version: '1.31.3-test' },
    baseUrl: '',
    logger: { info() {} },
  });
  assert.throws(() => service.issue(), /HTTP 地址/);
});

test('插件包 manifest 可从 tgz 读取，用于升级前校验', () => {
  const buffer = buildPluginTarball(root, { name: 'dsh-cow', version: '1.31.3-test' });
  const manifest = readPackageJsonFromTarball(buffer);
  assert.equal(manifest.name, 'dsh-cow');
  assert.match(String(manifest.version), /^\d+\.\d+\./);
});
