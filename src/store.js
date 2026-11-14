/**
 * 磁盘小工具：插件自己的状态文件都放在 `$DSH_HOME/cow/` 下，
 * 统一 0600、原子写（tmp + rename），避免半截文件。
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function resolveHomeDir() {
  const configured = String(process.env.DSH_HOME ?? '').trim();
  return configured || join(homedir(), '.dsh');
}

export function coDshDir(home = resolveHomeDir()) {
  return join(home, 'cow');
}

export function readJson(file, fallback = null) {
  try {
    const text = readFileSync(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function writeJsonAtomic(file, value, { mode = 0o600 } = {}) {
  mkdirSync(join(file, '..'), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, { mode });
  renameSync(tmp, file);
  try {
    chmodSync(file, mode);
  } catch {
    /* 某些文件系统不支持 chmod，忽略 */
  }
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
  return dir;
}
