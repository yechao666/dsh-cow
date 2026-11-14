/**
 * 主端消息路由：只负责把子 DSH 的 complete/ask 注入原会话，把 answer 发回子端。
 * 不维护任务、结果表或轮询队列。
 */
export class MessageRouter {
  constructor({ channel, inject, logger }) {
    this.channel = channel;
    this.inject = inject;
    this.logger = logger ?? console;
    this.questions = new Map(); // questionId -> { peer, envelope }
  }

  handle(from, frame) {
    const type = String(frame?.type ?? '');
    const payload = frame?.payload ?? {};
    if (type === 'msg.complete') {
      const origin = payload?.session?.id;
      if (origin) this.inject(origin, from, `[COW 完成] ${payload.text ?? ''}`, 'complete');
      return true;
    }
    if (type === 'msg.ask') {
      const questionId = payload?.questionId ?? payload?.messageId;
      if (!questionId) return false;
      this.questions.set(questionId, { peer: from, envelope: payload });
      const origin = payload?.session?.id;
      if (origin) {
        this.inject(origin, from, `[COW 询问] ${payload.text ?? ''}\n\nquestionId: ${questionId}`, 'ask');
      }
      return true;
    }
    return false;
  }

  answer(questionId, text) {
    const pending = this.questions.get(questionId);
    if (!pending) throw new Error('没有找到待回答的询问');
    this.questions.delete(questionId);
    this.channel.send(pending.peer, {
      type: 'msg.answer',
      payload: { ...pending.envelope, kind: 'answer', replyTo: questionId, text: String(text ?? '') },
    });
    return { questionId, status: 'sent' };
  }
}
