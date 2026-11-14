/**
 * 纯消息核心：不包含任务、认领、任务队列。
 * 主 DSH 派任务 = 一条 dispatch 消息；子 DSH 完成 = 一条 complete 消息。
 */
import { randomBytes } from 'node:crypto';

export const MESSAGE_KINDS = ['dispatch', 'complete', 'ask', 'answer'];

export function newMessageId(prefix = 'msg') {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

export function childKey({ peer, workspace, session }) {
  const ws = String(workspace?.id ?? workspace?.name ?? '').trim();
  const sid = String(session?.id ?? '').trim();
  if (!ws || !sid || !peer) throw new Error('缺少 peer/workspace.id/session.id，拒绝隔离不足的消息');
  return `${peer}::${ws}::${sid}`;
}

export function buildEnvelope({ kind, peer, text, workspace, session, approvalMode = 'follow', replyTo = '', questionId = '', options = [] }) {
  if (!MESSAGE_KINDS.includes(kind)) throw new Error(`未知消息类型：${kind}`);
  if (!peer) throw new Error('缺少 peer');
  if (!text) throw new Error('消息不能为空');
  const messageId = newMessageId(kind === 'ask' ? 'q' : 'msg');
  return {
    kind,
    messageId,
    questionId: questionId || (kind === 'ask' ? messageId : ''),
    replyTo,
    peer,
    text,
    options,
    workspace: { id: String(workspace?.id ?? ''), name: String(workspace?.name ?? ''), path: String(workspace?.path ?? '') },
    session: { id: String(session?.id ?? ''), title: String(session?.title ?? '') },
    approvalMode,
    createdAt: new Date().toISOString(),
  };
}

export function completeEnvelope(taskMessage, text) {
  return buildEnvelope({
    kind: 'complete',
    peer: taskMessage.fromPeer ?? taskMessage.peer,
    text,
    workspace: taskMessage.workspace,
    session: taskMessage.session,
    approvalMode: taskMessage.approvalMode,
    replyTo: taskMessage.messageId,
  });
}
