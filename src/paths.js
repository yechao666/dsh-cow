/**
 * 路径与工作目录白名单。
 *
 * 远端任务只能落在已声明的 allowedRoots 内 —— 这是 dsh-cow 最重要的
 * 一条安全边界：持有 peer token 的一方等于被授权在本机跑 Agent，而 Agent
 * 能读写文件，所以工作目录必须显式圈定。
 */
import { realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve, sep } from 'node:path';

/** 把用户输入（支持 `~`）规范成绝对路径；空值返回 null。 */
export function normalizeRoot(value) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  let candidate = trimmed;
  if (candidate === '~') candidate = homedir();
  else if (candidate.startsWith('~/') || candidate.startsWith('~\\')) candidate = join(homedir(), candidate.slice(2));
  return resolve(candidate);
}

/** 换行/逗号分隔的根目录列表 → 绝对路径数组（去重保序）。 */
export function normalizeRoots(input) {
  const list = Array.isArray(input) ? input : String(input ?? '').split(/[\r\n,]+/);
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const root = normalizeRoot(item);
    if (!root || seen.has(root)) continue;
    seen.add(root);
    result.push(root);
  }
  return result;
}

/** target 是否等于 root 或位于 root 之下（纯词法判定）。 */
export function isInside(root, target) {
  if (!root || !target) return false;
  if (target === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return target.startsWith(prefix);
}

function tryRealpath(value) {
  try {
    return realpathSync(value);
  } catch {
    return null;
  }
}

/**
 * 校验远端请求里的工作目录。
 *
 * @param {string|undefined|null} cwd 请求指定目录；缺省时用 roots[0]
 * @param {string[]} roots 已归一化的允许根目录
 * @returns {{ok: true, path: string, root: string} | {ok: false, reason: string}}
 */
export function resolveWorkspace(cwd, roots) {
  if (!Array.isArray(roots) || roots.length === 0) {
    return { ok: false, reason: 'no_roots' };
  }
  const requested = String(cwd ?? '').trim();
  const target = requested ? normalizeRoot(requested) : roots[0];
  if (!target) return { ok: false, reason: 'invalid_path' };
  if (!isAbsolute(target)) return { ok: false, reason: 'not_absolute' };

  // 1) 词法判定：先挡掉 `../` 之类的越界写法。
  const lexicalRoot = roots.find((root) => isInside(root, target));
  if (!lexicalRoot) return { ok: false, reason: 'outside_roots' };

  // 2) 真实路径判定：符号链接可能把目标带回根目录之外。
  const realTarget = tryRealpath(target);
  if (!realTarget) {
    // 目录还不存在是允许的（Agent 会创建），但父目录必须仍在根内。
    const realParent = tryRealpath(resolve(target, '..'));
    if (realParent) {
      const realRoots = roots.map((root) => tryRealpath(root)).filter(Boolean);
      if (realRoots.length > 0 && !realRoots.some((root) => isInside(root, realParent))) {
        return { ok: false, reason: 'outside_roots' };
      }
    }
    return { ok: true, path: target, root: lexicalRoot };
  }
  const realRoots = roots.map((root) => tryRealpath(root)).filter(Boolean);
  const matchedReal = realRoots.find((root) => isInside(root, realTarget));
  if (realRoots.length > 0 && !matchedReal) return { ok: false, reason: 'outside_roots' };
  return { ok: true, path: realTarget, root: matchedReal || lexicalRoot };
}
