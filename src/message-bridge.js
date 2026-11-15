/**
 * 纯消息桥：主 DSH 的 dispatch 直接进入子 DSH 会话；回合结束自动 complete。
 * 不建任务、不维护消息队列，排队交给 DSH Agent 输入队列。
 *
 * 子端会话按 `peerId + workspace.id` 复用：同一主 DSH 的同一工作区只保留一个
 * 子会话，多个主会话不再各自分裂一个子会话。每条 dispatch 自己带着发起方的
 * session，因此 complete / ask 仍然回到正确的原会话；回合产物也按 messageId
 * 从会话事件里精确提取。
 */
import { createHash, randomBytes } from 'node:crypto';
import { askEnvelope, completeEnvelope, summarizeSession, summarizeTurn, workspaceKey } from './message-core.js';

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
    this.sessions = new Map(); // workspace key -> record
    this.bySession = new Map(); // child sessionId -> record
    this.questions = new Map(); // questionId -> { resolve, timer, record }
    this.seen = new Set();
  }

  key(envelope) {
    return workspaceKey(envelope);
  }

  #sessionId(key) {
    return `session-cow-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
  }

  /** 子会话的派发上下文：用于 cow_send(kind=ask) 与回复路由。 */
  contextForSession(sessionId) {
    return this.bySession.get(String(sessionId ?? '')) ?? null;
  }

  #newRecord(sessionId, agent, workspacePath, envelope, handle = null) {
    return {
      sessionId,
      agent,
      workspacePath,
      handle,
      envelopes: new Map(), // messageId -> dispatch envelope（尚未完成）
      completed: new Set(),
      parent: '',
      parentLabel: '',
      createdAt: envelope?.createdAt ?? new Date().toISOString(),
    };
  }

  async ensure(envelope) {
    const key = this.key(envelope);
    const existing = this.sessions.get(key);
    if (existing?.agent) return existing;
    const sessionId = this.#sessionId(key);
    const live = this.agents.get?.(sessionId);
    if (live?.session) {
      const record = this.#newRecord(sessionId, live, this.workspacePath(envelope.workspace), envelope);
      this.sessions.set(key, record);
      this.bySession.set(sessionId, record);
      return record;
    }
    const cwd = this.workspacePath(envelope.workspace);
    // 进程重启后同一个工作区键会算出同一个 sessionId：优先 resume 已持久化的子会话，
    // 否则才新建。这样子端不会因为重启再长出一堆重复会话。
    let handle = null;
    let resumed = false;
    try {
      handle = await this.agents.resume?.({ resumeSessionId: sessionId, agentOptions: this.agentOptions() });
      resumed = Boolean(handle);
    } catch {
      handle = null;
    }
    if (!handle) {
      handle = await this.agents.create({ sessionId, meta: { cwd }, agentOptions: this.agentOptions() });
    }
    const agent = handle?.agent ?? handle;
    if (!agent) throw new Error('agents.create 没有返回 Agent');
    const record = this.#newRecord(sessionId, agent, cwd, envelope, handle?.dispose ? handle : null);
    this.sessions.set(key, record);
    this.bySession.set(sessionId, record);
    if (!resumed) await this.prepareAgent(agent, envelope, cwd);
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

  async dispatch(envelope, from, fromId = '') {
    if (!this.#remember(envelope.messageId)) {
      const record = this.sessions.get(this.key(envelope));
      return { messageId: envelope.messageId, sessionId: record?.sessionId, status: 'duplicate' };
    }
    const record = await this.ensure(envelope);
    record.envelopes.set(envelope.messageId, envelope);
    record.parent = fromId || from;
    record.parentLabel = from;
    // 必须在 followup 之前取水位，否则会漏掉这条消息的 user/message 事件。
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
      // 同一子会话可能排着多个主会话的消息：优先只抽取这条消息对应的一轮。
      const turnText = summarizeTurn(session, firstSeq, envelope.messageId);
      text = turnText === null ? String(this.summarize(session, firstSeq) ?? '').trim() : turnText;
      if (!text) text = '（子 DSH 本轮没有文本输出）';
    } catch (error) {
      text = `子 DSH 执行失败：${error?.message ?? error}`;
      this.logger.warn?.(`[dsh-cow] 获取本轮结果失败：${error?.message ?? error}`);
    } finally {
      record.envelopes.delete(envelope.messageId);
      record.completed.add(envelope.messageId);
      if (record.completed.size > SEEN_LIMIT) record.completed.delete(record.completed.values().next().value);
    }
    const payload = completeEnvelope(envelope, text);
    try {
      this.channel.send(parent, { type: 'msg.complete', payload });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 完成通知发送失败：${error?.message ?? error}`);
    }
  }

  /**
   * 找出当前正在处理的那条 dispatch：
   * 子会话事件里最近一条属于待完成消息的 user/message 就是当前上下文。
   */
  #activeEnvelope(record) {
    const session = record.agent?.session;
    if (session?.eventAt) {
      for (let seq = session.seq - 1; seq >= 0; seq -= 1) {
        const event = session.eventAt(seq);
        if (event?.type !== 'user/message') continue;
        const id = String(event.data?.id ?? '');
        const found = record.envelopes.get(id);
        if (found) return found;
        // 遇到更晚的普通消息就继续往前找，直到命中已知 dispatch。
      }
    }
    const pending = [...record.envelopes.values()];
    return pending.length ? pending[pending.length - 1] : null;
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
    const context = this.#activeEnvelope(record);
    if (!context) return { ok: false, error: '找不到这条消息的发起方上下文' };
    const payload = askEnvelope(context, text, options);
    const waitMs = Math.min(3600, Math.max(5, Number(timeoutSec) || 300)) * 1000;
    // 先登记等待者再发送：回答可能在 send 返回前就被路由回来（本机/测试直连）。
    const waiting = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.questions.delete(payload.questionId);
        try {
          this.channel.send(target, {
            type: 'msg.ask.cancel',
            payload: { questionId: payload.questionId, messageId: payload.messageId, session: payload.session },
          });
        } catch { /* 忽略 */ }
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
  async handleAnswer(envelope, from, fromId = '') {
    const questionId = String(envelope?.replyTo || envelope?.questionId || '');
    const pending = questionId ? this.questions.get(questionId) : null;
    if (pending) {
      this.questions.delete(questionId);
      clearTimeout(pending.timer);
      pending.resolve({ ok: true, answer: String(envelope?.text ?? ''), questionId });
      return { questionId, status: 'resolved' };
    }
    return this.answer(envelope, from, fromId);
  }

  async answer(envelope, from, fromId = '') {
    if (!this.#remember(envelope.messageId)) return { messageId: envelope.messageId, status: 'duplicate' };
    const record = await this.ensure(envelope);
    record.parent = record.parent || fromId || from;
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
