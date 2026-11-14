/**
 * 会话/工作区描述：每条 cow 消息都必须带 workspace（id/name/path）与
 * session（id/title）。这里只做只读解析，不创建任何记录。
 */
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { resolveWorkspace } from './paths.js';

function safeGet(ctx, name) {
  try {
    return ctx?.get?.(name, false) ?? null;
  } catch {
    return null;
  }
}

/** 从 live Session 解析消息信封需要的 workspace/session 字段。 */
export function sessionInfo(ctx, session) {
  const id = String(session?.id ?? session?.sessionId ?? '');
  const cwd = String(session?.header?.cwd ?? session?.meta?.cwd ?? '');
  let workspace = null;
  const registry = safeGet(ctx, 'workspaceRegistry');
  try {
    workspace = registry?.list?.().find((item) => (item.sessionIds ?? []).includes(id)) ?? null;
  } catch {
    workspace = null;
  }
  let title = '';
  try {
    title = String(safeGet(ctx, 'sessionTitle')?.get?.(session)?.title ?? '');
  } catch {
    title = '';
  }
  return {
    session: { id, title },
    workspace: {
      id: String(workspace?.id ?? cwd ?? id),
      name: String(workspace?.title ?? (cwd ? basename(cwd) : title) ?? ''),
      path: String(workspace?.path ?? cwd ?? ''),
    },
  };
}

/** 子端把主端的 workspace.path 映射成本机 allowedRoots 内的目录。 */
export function resolveChildCwd({ workspace, roots }) {
  const list = Array.isArray(roots) ? roots : [];
  if (list.length === 0) throw new Error('本机没有配置 allowedRoots，拒绝执行远端消息');
  const requested = String(workspace?.path ?? '').trim();
  if (requested) {
    const checked = resolveWorkspace(requested, list);
    if (checked.ok) return ensureCwd(checked.path);
  }
  // 主端路径在本机不可用时，落到根目录下的工作区同名目录；同名根目录直接复用。
  const name = String(workspace?.name ?? '').trim().replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 80);
  if (!name) return ensureCwd(list[0]);
  const sameRoot = list.find((root) => basename(root) === name);
  return ensureCwd(sameRoot ?? join(list[0], name));
}

/** Agent 会话必须有一个已存在的工作目录；只允许在 allowedRoots 内创建。 */
function ensureCwd(path) {
  try {
    mkdirSync(path, { recursive: true });
  } catch {
    /* 目录已存在或创建失败时交给 agents.create 报错 */
  }
  return path;
}
