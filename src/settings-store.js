/**
 * 设置页写入的本地覆盖层：`$DSH_HOME/cow/settings.json`。
 *
 * 为什么不直接写 profile 的 cordis.patch.yml：那是装配配置，改它要重载插件树，
 * 而且 token 之类的敏感值不该进配置层。用户可在设置页改的字段落在这里，
 * 由 `resolveConfig` 在读取时合并覆盖。文件改动会被 mtime 缓存感知，无需重启。
 */
import { join } from 'node:path';
import { statSync } from 'node:fs';
import { coDshDir, readJson, writeJsonAtomic } from './store.js';

/** 设置页允许修改的字段（其余字段仍由 profile 装配配置决定）。 */
export const EDITABLE_KEYS = [
  'displayName',
  'department',
  'owner',
  'capabilityNote',
  'declaredCapabilities',
  'allowedRoots',
  'probes',
  'autoDetect',
  'agentPreset',
  'listenPort',
  'listenHost',
  'maxFileMB', 'maxConcurrentFiles',
  'messageTtlMinutes',
  'proxyEnabled', 'proxyAllowHosts', 'proxyAllowPrivate', 'proxyViaParent', 'proxyLogLimit',
  'discoveryEnabled', 'discoveryPort',
];

const BOOLEAN_KEYS = new Set(['serverEnabled', 'channelEnabled', 'autoDetect', 'proxyEnabled', 'proxyAllowPrivate', 'proxyViaParent', 'discoveryEnabled']);
const NUMBER_KEYS = new Set(['listenPort', 'maxFileMB', 'maxConcurrentFiles', 'messageTtlMinutes', 'capabilityRefreshMinutes', 'proxyLogLimit', 'discoveryPort']);

let cache = { file: '', stamp: 0, value: null };

export function settingsPath(home) {
  return join(coDshDir(home), 'settings.json');
}

/** 读取覆盖层（带 mtime 缓存，文件没变就不重新解析）。 */
export function readSettings(home) {
  const file = settingsPath(home);
  let stamp = 0;
  try {
    stamp = statSync(file).mtimeMs;
  } catch {
    return {};
  }
  if (cache.file === file && cache.stamp === stamp && cache.value) return cache.value;
  const data = readJson(file, null);
  const value = data && typeof data.settings === 'object' && data.settings ? data.settings : {};
  cache = { file, stamp, value };
  return value;
}

/**
 * 写入覆盖层（只接受白名单字段），返回合并后的完整设置。
 * 传 `undefined` 的字段保持不变；传空字符串表示清空覆盖（回落到装配配置）。
 */
export function writeSettings(home, patch = {}) {
  const current = { ...readSettings(home) };
  for (const key of EDITABLE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
    const value = patch[key];
    if (value === undefined) continue;
    if (value === null || value === '') {
      delete current[key];
      continue;
    }
    if (BOOLEAN_KEYS.has(key)) current[key] = Boolean(value);
    else if (NUMBER_KEYS.has(key)) {
      const number = Number(value);
      if (!Number.isFinite(number)) continue;
      // 开放端口允许 0（表示复用宿主 Web 端口），其他数值字段必须为正。
      if (key === 'listenPort' ? number >= 0 : number > 0) current[key] = Math.round(number);
    } else current[key] = String(value);
  }
  writeJsonAtomic(settingsPath(home), {
    schema: 1,
    updatedAt: new Date().toISOString(),
    settings: current,
  });
  cache = { file: '', stamp: 0, value: null };
  return current;
}
