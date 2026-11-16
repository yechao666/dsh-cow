/**
 * 主端消息路由：只负责把子 DSH 的 complete/ask 注入原会话，把 answer 发回子端。
 * 不维护任务、结果表或轮询队列。
 */
const SEEN_LIMIT = 512;

/** JSON string quoting for header fields such as peerName. */
function quote(value) {
  return JSON.stringify(String(value ?? ''));
}

/** Wrap remote text in a message-scoped boundary so the model can tell it apart from the header. */
function contentBlock(text, messageId) {
  const suffix = String(messageId ?? '').replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64);
  const marker = suffix ? ` ${suffix}` : '';
  return `<<<COW_CONTENT_BEGIN${marker}>>>\n${text}\n<<<COW_CONTENT_END${marker}>>>`;
}

export class MessageRouter {
  constructor({ channel, inject, logger, selfName, parentLabel, parentId, questionTtlMs = 10 * 60_000 }) {
    this.channel = channel;
    this.inject = inject;
    this.logger = logger ?? console;
    this.questionTtlMs = questionTtlMs;
    this.selfName = typeof selfName === 'function' ? selfName : () => String(selfName ?? '本机');
    this.parentLabel = typeof parentLabel === 'function' ? parentLabel : () => String(parentLabel ?? '');
    this.parentId = typeof parentId === 'function' ? parentId : () => String(parentId ?? '');
    this.questions = new Map(); // questionId -> { peer, envelope }
    this.seen = new Set();
  }

  #firstSeen(messageId) {
    const id = String(messageId ?? '');
    if (!id) return true;
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > SEEN_LIMIT) this.seen.delete(this.seen.values().next().value);
    return true;
  }

  handle(from, frame, fromId = '') {
    const type = String(frame?.type ?? '');
    const payload = frame?.payload ?? {};
    if (type === 'msg.complete') {
      if (!this.#firstSeen(payload?.messageId)) return true;
      const origin = payload?.session?.id;
      const text = String(payload?.text ?? '');
      const senderId = String(fromId || payload?.peerId || '').trim() || '(unknown)';
      if (origin) {
        const header = `[COW 完成] peerId=${senderId} peerName=${quote(from)}${payload?.replyTo ? ` replyTo=${payload.replyTo}` : ''}`;
        this.inject(origin, from, `${header}\n${contentBlock(text, payload?.messageId)}`, 'complete', payload);
      }
      return true;
    }
    if (type === 'msg.ask.cancel') {
      const questionId = String(payload?.questionId ?? payload?.replyTo ?? '');
      if (questionId) this.questions.delete(questionId);
      return true;
    }
    if (type === 'msg.ask') {
      const questionId = payload?.questionId ?? payload?.messageId;
      if (!questionId) return false;
      if (!this.#firstSeen(payload?.messageId ?? questionId)) return true;
      this.questions.set(questionId, { peerName: from, peerId: String(fromId || payload?.peerId || ''), envelope: payload, at: Date.now() });
      const origin = payload?.session?.id;
      if (origin) {
        const self = this.selfName();
        const parent = this.parentId() || this.parentLabel();
        const asker = String(payload?.peerId || fromId || from);
        const header = `[COW 询问] peerId=${asker} peerName=${quote(from)} questionId=${questionId}`;
        const lines = [
          header,
          contentBlock(String(payload.text ?? ''), questionId),
          '',
          `这条询问由你（${self}）处理，不要留给设置页：`,
          '1. 先自己判断能否直接答复；',
          '2. 涉及人工决策时，调用 ask_user_question 让用户在本机界面输入；',
          ...(parent ? [`3. 需要上级拍板时，用 cow_send(peerId="${parent}", kind="ask", message="…") 向上级请示；`] : []),
          `最后用 cow_send(peerId="${asker}", replyTo="${questionId}", message="最终答复") 发回。`,
        ];
        this.inject(origin, from, lines.join('\n'), 'ask', payload);
      }
      return true;
    }
    return false;
  }

  answer(questionId, text) {
    const id = String(questionId ?? '');
    const pending = this.questions.get(id);
    if (!pending) throw new Error('没有找到待回答的询问');
    const sent = this.channel.send(pending.peerId || pending.peerName, {
      type: 'msg.answer',
      payload: { ...pending.envelope, kind: 'answer', replyTo: id, text: String(text ?? '') },
    });
    if (!sent?.delivered && !sent?.queued) throw new Error('回答未送达：未知节点或通道不可用');
    this.questions.delete(id);
    return { questionId: id, status: sent.delivered ? 'sent' : 'queued' };
  }

  pending() {
    const now = Date.now();
    for (const [questionId, item] of this.questions) {
      if (this.questionTtlMs > 0 && now - Number(item.at ?? now) > this.questionTtlMs) this.questions.delete(questionId);
    }
    return [...this.questions.entries()].map(([questionId, item]) => ({
      questionId,
      peerId: item.peerId ?? '',
      peerName: item.peerName ?? '',
      question: String(item.envelope?.text ?? ''),
      options: item.envelope?.options ?? [],
      session: item.envelope?.session?.id ?? '',
      createdAt: item.envelope?.createdAt ?? '',
    }));
  }

  dispose() {
    this.questions.clear();
    this.seen.clear();
  }
}
