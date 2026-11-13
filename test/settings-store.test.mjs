import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EDITABLE_KEYS, readSettings, settingsPath, writeSettings } from '../src/settings-store.js';
import { resolveConfig } from '../src/config.js';

function tempHome() {
  return mkdtempSync(join(tmpdir(), 'cow-settings-'));
}

test('写入只接受白名单字段，并强制类型', () => {
  const home = tempHome();
  writeSettings(home, {
    displayName: 'mac-mini',
    allowedRoots: '/work\n/data',
    maxTaskMinutes: '30',
    maxFileMB: '80',
    // 不在白名单里的字段应被忽略
    apiKey: 'should-not-be-written',
  });
  const stored = readSettings(home);
  assert.equal(stored.displayName, 'mac-mini');
  assert.equal(stored.allowedRoots, '/work\n/data');
  assert.equal(stored.maxTaskMinutes, 30);
  assert.equal(stored.maxFileMB, 80);
  assert.equal(stored.apiKey, undefined);
  assert.deepEqual(Object.keys(stored).sort(), ['allowedRoots', 'displayName', 'maxFileMB', 'maxTaskMinutes']);
  assert.equal(settingsPath(home).endsWith('cow/settings.json'), true);
});

test('开放端口可以设为 0（复用宿主端口），其他数值字段必须为正', () => {
  const home = tempHome();
  writeSettings(home, { listenPort: 3100 });
  assert.equal(readSettings(home).listenPort, 3100);
  writeSettings(home, { listenPort: '0' });
  assert.equal(readSettings(home).listenPort, 0);
  writeSettings(home, { maxTaskMinutes: 0 });
  assert.equal(readSettings(home).maxTaskMinutes, undefined, '0 不是合法的任务时长');
});

test('空字符串表示清空覆盖，回落到装配配置', () => {
  const home = tempHome();
  writeSettings(home, { displayName: 'first', declaredCapabilities: 'intranet.pay | 支付内网 | pay | 只能访问支付内网' });
  writeSettings(home, { displayName: '' });
  const stored = readSettings(home);
  assert.equal(stored.displayName, undefined);
  assert.match(stored.declaredCapabilities, /intranet\.pay/);
});

test('覆盖层合并到 resolveConfig 后生效', () => {
  const home = tempHome();
  writeSettings(home, { displayName: 'from-ui', allowedRoots: '/ui/root', relayPollSeconds: 5, channelEnabled: false });
  const merged = { ...{ displayName: 'from-profile', allowedRoots: '/profile/root' }, ...readSettings(home) };
  const cfg = resolveConfig(merged);
  assert.equal(cfg.displayName, 'from-ui');
  assert.equal(cfg.allowedRoots, '/ui/root');
  assert.equal(cfg.relayPollSeconds, 5);
  // 长连接是协议的一部分，配置层不可关闭
  assert.equal(cfg.channelEnabled, true);
});

test('设置页可改字段清单是显式白名单', () => {
  assert.ok(EDITABLE_KEYS.includes('displayName'));
  assert.ok(EDITABLE_KEYS.includes('declaredCapabilities'));
  assert.ok(EDITABLE_KEYS.includes('allowedRoots'));
  assert.ok(EDITABLE_KEYS.includes('listenPort'), '关闭仅本机监听时需要能改端口');
  assert.ok(EDITABLE_KEYS.includes('listenHost'));
});

test('文件不存在时返回空对象', () => {
  assert.deepEqual(readSettings(tempHome()), {});
});
