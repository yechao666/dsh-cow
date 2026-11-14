/**
 * 纯消息桥：主 DSH 的 dispatch 直接进入子 DSH 会话；回合结束自动 complete。
 * 不建任务、不维护消息队列，排队交给 DSH Agent 输入队列。
 */
import { createHash } from 'node:crypto';

export class MessageBridge {
  constructor({ channel, agents, logger, agentOptions, summarize, workspacePath }) {
    this.channel = channel;
    this.agents = agents;
    this.logger = logger ?? console;
    this.agentOptions = agentOptions ?? (() => ({}));
    this.summarize = summarize ?? (() => '');
    this.workspacePath = workspacePath ?? ((name) => name);
    this.sessions = new Map(); // isolation key -> { sessionId, agent, workspacePath }
  }

  key(envelope) {
    const ws = envelope?.workspace?.id;
    const sid = envelope?.session?.id;
    const peer = envelope?.peer;
    if (!ws || !sid || !peer) throw new Error('dispatch 缺少 workspace.id/session.id/peer');
    return `${peer}::${ws}::${sid}`;
  }

  #sessionId(key) {
    return `session-cow-${createHash('sha256').update(key).digest('hex').slice(0, 16)}`;
  }

  async ensure(envelope) {
    const key = this.key(envelope);
    const existing = this.sessions.get(key);
    if (existing?.agent) return existing;
    const sessionId = this.#sessionId(key);
    const live = this.agents.get?.(sessionId);
    if (live?.session) {
      const record = { sessionId, agent: live, workspacePath: this.workspacePath(envelope.workspace) };
      this.sessions.set(key, record);
      return record;
    }
    const cwd = this.workspacePath(envelope.workspace);
    const handle = await this.agents.create({ sessionId, meta: { cwd }, agentOptions: this.agentOptions() });
    const agent = handle?.agent ?? handle;
    if (!agent) throw new Error('agents.create 没有返回 Agent');
    const record = { sessionId, agent, workspacePath: cwd };
    this.sessions.set(key, record);
    return record;
  }

  async dispatch(envelope, from) {
    const record = await this.ensure(envelope);
    const session = record.agent.session;
    const firstSeq = session?.seq ?? 0;
    record.agent.followup({
      id: envelope.messageId,
      role: 'user',
      content: [{ type: 'text', text: envelope.text }],
      source: { kind: 'cow-dispatch' },
    });
    void (async () => {
      try {
        await record.agent.whenIdle();
        const summary = session ? this.summarize(session, firstSeq) : '';
        this.channel.send(from, {
          type: 'msg.complete',
          payload: {
            ...envelope,
            kind: 'complete',
            replyTo: envelope.messageId,
            text: summary,
          },
        });
      } catch (error) {
        this.logger.warn?.(`[dsh-cow] 完成通知失败：${error?.message ?? error}`);
      }
    })();
    return { messageId: envelope.messageId, sessionId: record.sessionId, status: 'sent' };
  }

  async answer(envelope, from) {
    const record = await this.ensure(envelope);
    record.agent.followup({
      id: envelope.messageId,
      role: 'user',
      content: [{ type: 'text', text: `[COW 回答] ${envelope.text}` }],
      source: { kind: 'cow-answer' },
    });
    return { messageId: envelope.messageId, sessionId: record.sessionId, status: 'sent' };
  }
}
