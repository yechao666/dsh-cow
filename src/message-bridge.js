/**
 * 纯消息桥：主 DSH 的 dispatch 直接进入子 DSH 会话；回合结束自动 complete。
 * 不建任务、不维护消息队列，排队交给 DSH Agent 输入队列。
 *
 * 子端会话按 `peer + workspace.id + session.id` 隔离：同一个主会话派来的消息
 * 复用同一个子会话，不同主会话互不串线。子端的 ask/answer 复用同一隔离键。
 */
import { createHash, randomBytes } from 'node:crypto';
import { askEnvelope, childKey, completeEnvelope, summarizeSession } from './message-core.js';

const SEEN_LIMIT = 512;

function messageObject({ id, text, source = 'user' }) {
  return {
    id: id || randomBytes(8).toString('hex'),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: source },
  };
}

export class MessageBridge {
  constructor({ channel, agents, logger, agentOptions, summarize, workspacePath, prepareAgent, finishTurn }) {
    this.channel = channel;
    this.agents = agents; // 只要求 get(sessionId)
    this.logger = logger ?? console;
    this.agentOptions = agentOptions ?? (() => ({}));
    this.summarize = summarize ?? summarizeSession;
    this.workspacePath = workspacePath ?? ((name) => name);
    this.prepareAgent = prepareAgent ?? (async () => {});
    this.finishTurn = finishTurn ?? (async () => {});
    this.sessions = new Map(); // isolation key -> { sessionId, agent, envelope, parent }
    this.bySession = new Map(); // child sessionId -> record
    this.questions = new Map(); // questionId -> { resolve, timer, record }
    this.seen = new Set();
  }

  key(envelope) {
    return childKey(envelope);
  }

  #sessionId(key) {
    return `session-cow-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
  }

  /** 子会话的派发上下文：用于 cow_send(kind=ask) 与回复路由。 */
  contextForSession(sessionId) {
    return this.bySession.get(String(sessionId ?? '')) ?? null;
  }

  async ensure(envelope) {
    const key = this.key(envelope);
    const existing = this.sessions.get(key);
    if (existing?.agent) return existing;
    const sessionId = this.#sessionId(key);
    const live = this.agents.get?.(sessionId);
    if (live?.session) {
      const record = { sessionId, agent: live, workspacePath: this.workspacePath(envelope.workspace), envelope };
      this.sessions.set(key, record);
      this.bySession.set(sessionId, record);
      return record;
    }
    const cwd = this.workspacePath(envelope.workspace);
    const handle = await this.agents.create({ sessionId, meta: { cwd }, agentOptions: this.agentOptions() });
    const agent = handle?.agent ?? handle;
    if (!agent) throw new Error('agents.create 没有返回 Agent');
    const record = { sessionId, agent, workspacePath: cwd, envelope, handle: handle?.dispose ? handle : null };
    this.sessions.set(key, record);
    this.bySession.set(sessionId, record);
    await this.prepareAgent(agent, envelope, cwd);
    return record;
  }

  #remember(messageId) {
    const id = String(messageId ?? '');
    if (!id) return true;
    if (this.seen.has(id)) return false;
    this.seen.add(id);
    if (this.seen.size > SEEN_LIMIT) this.seen.delete(this.seen.values().next().value);
    return true;
  }

  async dispatch(envelope, from) {
    if (!this.#remember(envelope.messageId)) {
      const record = this.sessions.get(this.key(envelope));
      return { messageId: envelope.messageId, sessionId: record?.sessionId, status: 'duplicate' };
    }
    const record = await this.ensure(envelope);
    record.envelope = envelope;
    record.parent = from;
    // 必须在 followup 之前取水位，否则会漏掉本轮 turn/start，摘要读不到本轮文本与错误。
    const firstSeq = record.agent.session?.seq ?? 0;
    record.agent.followup(messageObject({ id: envelope.messageId, text: envelope.text }));
    void this.#completeAfter(record, envelope, from, firstSeq);
    return { messageId: envelope.messageId, sessionId: record.sessionId, status: 'sent' };
  }

  async #completeAfter(record, envelope, parent, firstSeq) {
    const agent = record.agent;
    const session = agent?.session;
    let text = '';
    try {
      await agent.whenIdle?.();
      await this.finishTurn(agent);
      text = String(this.summarize(session, firstSeq) ?? '').trim();
      if (!text) text = '（子 DSH 本轮没有文本输出）';
    } catch (error) {
      text = `子 DSH 执行失败：${error?.message ?? error}`;
      this.logger.warn?.(`[dsh-cow] 获取本轮结果失败：${error?.message ?? error}`);
    }
    const payload = completeEnvelope(envelope, text);
    try {
      this.channel.send(parent, { type: 'msg.complete', payload });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 完成通知发送失败：${error?.message ?? error}`);
    }
  }

  /**
   * 子端向上级提问并等待回答（不建任务，只发一条 ask 消息）。
   * @returns {Promise<{ok: boolean, answer?: string, questionId?: string, error?: string}>}
   */
  async ask({ sessionId, question, options = [], timeoutSec = 300 }) {
    const text = String(question ?? '').trim();
    if (!text) return { ok: false, error: '问题不能为空' };
    const record = this.contextForSession(sessionId);
    if (!record) return { ok: false, error: '当前会话不是上级派来的消息会话，无法提问' };
    const target = record.parent;
    if (!target) return { ok: false, error: '找不到发起方节点' };
    const payload = askEnvelope(record.envelope, text, options);
    const waitMs = Math.min(3600, Math.max(5, Number(timeoutSec) || 300)) * 1000;
    // 先登记等待者再发送：回答可能在 send 返回前就被路由回来（本机/测试直连）。
    const waiting = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.questions.delete(payload.questionId);
        resolve({ ok: false, error: '等待上级回答超时', questionId: payload.questionId });
      }, waitMs);
      timer.unref?.();
      this.questions.set(payload.questionId, { resolve, timer, record });
    });
    let sent;
    try {
      sent = this.channel.send(target, { type: 'msg.ask', payload });
    } catch (error) {
      sent = { delivered: false, error };
    }
    if (!sent?.delivered && !sent?.queued) {
      const pending = this.questions.get(payload.questionId);
      if (pending) {
        clearTimeout(pending.timer);
        this.questions.delete(payload.questionId);
      }
      return { ok: false, error: '上级当前不在线，问题没有送达' };
    }
    return waiting;
  }

  /**
   * 收到 msg.answer：先兑现正在等待的 ask；没有等待者时作为新一轮输入注入子会话。
   */
  async handleAnswer(envelope, from) {
    const questionId = String(envelope?.replyTo || envelope?.questionId || '');
    const pending = questionId ? this.questions.get(questionId) : null;
    if (pending) {
      this.questions.delete(questionId);
      clearTimeout(pending.timer);
      pending.resolve({ ok: true, answer: String(envelope?.text ?? ''), questionId });
      return { questionId, status: 'resolved' };
    }
    return this.answer(envelope, from);
  }

  async answer(envelope, from) {
    if (!this.#remember(envelope.messageId)) return { messageId: envelope.messageId, status: 'duplicate' };
    const record = await this.ensure(envelope);
    record.envelope = record.envelope ?? envelope;
    record.parent = record.parent ?? from;
    record.agent.followup(messageObject({ id: envelope.messageId, text: `[COW 回答] ${envelope.text}` }));
    return { messageId: envelope.messageId, sessionId: record.sessionId, status: 'sent' };
  }

  /** 进程退出或会话释放时清空等待中的提问。 */
  dispose() {
    for (const pending of this.questions.values()) {
      clearTimeout(pending.timer);
      pending.resolve({ ok: false, error: '消息桥已关闭' });
    }
    for (const record of this.sessions.values()) {
      try { void record.handle?.dispose?.(); } catch { /* 忽略 */ }
    }
    this.questions.clear();
    this.sessions.clear();
    this.bySession.clear();
  }
}
