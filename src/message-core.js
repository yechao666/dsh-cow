/**
 * 纯消息核心：不包含任务、认领、任务队列。
 * 主 DSH 派任务 = 一条 dispatch 消息；子 DSH 完成 = 一条 complete 消息。
 */
import { randomBytes } from 'node:crypto';

export const MESSAGE_KINDS = ['dispatch', 'complete', 'ask', 'answer'];

export function newMessageId(prefix = 'msg') {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

/** 子端会话的复用键：同一 peer + 工作区共用一个子会话，不再按主会话分裂。 */
export function workspaceKey({ peerId, peerName, peer, workspace }) {
  const node = String(peerId || peerName || peer || '').trim();
  const ws = String(workspace?.id ?? workspace?.name ?? '').trim();
  if (!node || !ws) throw new Error('缺少 peerId/workspace.id，无法定位子会话');
  return `${node}::${ws}`;
}

export function buildEnvelope({ kind, peerId = '', peerName, peer, text, workspace, session, approvalMode = 'follow', replyTo = '', questionId = '', options = [] }) {
  if (!MESSAGE_KINDS.includes(kind)) throw new Error(`未知消息类型：${kind}`);
  const displayName = String(peerName ?? peer ?? '').trim();
  if (!peerId && !displayName) throw new Error('缺少 peerId（可选 peerName）');
  if (!text) throw new Error('消息不能为空');
  const messageId = newMessageId(kind === 'ask' ? 'q' : 'msg');
  return {
    kind,
    messageId,
    questionId: questionId || (kind === 'ask' ? messageId : ''),
    replyTo,
    peerId: String(peerId ?? ''),
    peerName: displayName,
    // 兼容旧节点的只读别名；新代码一律读 peerName。等所有节点 >=1.27 后可移除。
    peer: displayName,
    text,
    options,
    workspace: { id: String(workspace?.id ?? ''), name: String(workspace?.name ?? ''), path: String(workspace?.path ?? '') },
    session: { id: String(session?.id ?? ''), title: String(session?.title ?? '') },
    approvalMode,
    createdAt: new Date().toISOString(),
  };
}

/** complete 消息引用原 dispatch 消息：peer/workspace/session 原样带回。 */
export function completeEnvelope(dispatchMessage, text) {
  return buildEnvelope({
    kind: 'complete',
    peerId: dispatchMessage.peerId,
    peerName: dispatchMessage.peerName ?? dispatchMessage.peer,
    text,
    workspace: dispatchMessage.workspace,
    session: dispatchMessage.session,
    approvalMode: dispatchMessage.approvalMode,
    replyTo: dispatchMessage.messageId,
  });
}

/** ask 消息复用原 dispatch 的 peer/workspace/session，只替换正文与类型。 */
export function askEnvelope(dispatchMessage, text, options = []) {
  return buildEnvelope({
    kind: 'ask',
    peerId: dispatchMessage.peerId,
    peerName: dispatchMessage.peerName ?? dispatchMessage.peer,
    text,
    options: Array.isArray(options) ? options : [],
    workspace: dispatchMessage.workspace,
    session: dispatchMessage.session,
    approvalMode: dispatchMessage.approvalMode,
  });
}

/** answer 消息引用提问消息：peer/workspace/session 原样带回。 */
export function answerEnvelope(askMessage, text) {
  return buildEnvelope({
    kind: 'answer',
    peerId: askMessage.peerId,
    peerName: askMessage.peerName ?? askMessage.peer,
    text,
    workspace: askMessage.workspace,
    session: askMessage.session,
    approvalMode: askMessage.approvalMode,
    replyTo: askMessage.questionId || askMessage.messageId,
  });
}

/**
 * 从 Session 持久事件里提取 fromSeq 之后本轮最后的助手文本；turn/end 报错时抛出。
 * 只读 Session 事件，不依赖任何任务记录。
 */
export function summarizeSession(session, fromSeq) {
  let started = false;
  let text = '';
  let error = null;
  const first = Number.isFinite(Number(fromSeq)) ? Number(fromSeq) : 0;
  for (let seq = first; seq < session.seq; seq += 1) {
    const event = session.eventAt(seq);
    if (!event) continue;
    if (event.type === 'turn/start') {
      started = true;
      continue;
    }
    if (!started) continue;
    if (event.type === 'assistant/message') {
      const content = event.data?.message?.content ?? [];
      const joined = Array.isArray(content)
        ? content
            .filter((block) => block?.type === 'text')
            .map((block) => String(block.text ?? ''))
            .join('')
        : '';
      if (joined.trim()) text = joined;
    }
    if (event.type === 'turn/end') {
      const reason = event.data?.reason;
      if (reason?.kind === 'error') error = reason.error ?? new Error('Agent 执行失败');
    }
  }
  if (error) {
    const message = error instanceof Error
      ? error.message
      : (error?.message ? String(error.message) : (() => { try { return JSON.stringify(error); } catch { return String(error); } })());
    throw new Error(message);
  }
  return text.trim();
}


/**
 * 从 fromSeq 之后找到指定 messageId 那一轮的助手文本。
 * 同一子会话可能连续收到多个主会话的消息，必须按消息找出对应回合。
 * 返回 null 表示事件里没找到这条消息（调用方可回退到整段摘要）。
 */
export function summarizeTurn(session, fromSeq, messageId) {
  const id = String(messageId ?? '');
  if (!id || typeof session?.eventAt !== 'function') return null;
  const first = Number.isFinite(Number(fromSeq)) ? Number(fromSeq) : 0;
  let started = false;
  let text = '';
  let error = null;
  for (let seq = first; seq < session.seq; seq += 1) {
    const event = session.eventAt(seq);
    if (!event) continue;
    if (!started) {
      if (event.type === 'user/message' && String(event.data?.id ?? '') === id) started = true;
      continue;
    }
    if (event.type === 'user/message') {
      // 只有下一条「真实用户输入」才代表本轮结束；runtime-context / skill-catalog
      // 等注入也走 user/message，不能把它们当成下一条 dispatch。
      const nextId = String(event.data?.id ?? '');
      const sourceKind = String(event.data?.source?.kind ?? '');
      if (nextId !== id && (sourceKind === 'user' || sourceKind === 'steering')) break;
      continue;
    }
    if (event.type === 'assistant/message') {
      const content = event.data?.message?.content ?? [];
      const joined = Array.isArray(content)
        ? content
            .filter((block) => block?.type === 'text')
            .map((block) => String(block.text ?? ''))
            .join('')
        : '';
      if (joined.trim()) text = joined;
    }
    if (event.type === 'turn/end') {
      const reason = event.data?.reason;
      if (reason?.kind === 'error') error = reason.error ?? new Error('Agent 执行失败');
      break;
    }
  }
  if (!started) return null;
  if (error) {
    const message = error instanceof Error
      ? error.message
      : (error?.message ? String(error.message) : (() => { try { return JSON.stringify(error); } catch { return String(error); } })());
    throw new Error(message);
  }
  return text.trim();
}
