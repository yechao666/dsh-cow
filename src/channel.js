/**
 * 长连接通道：两台装了 dsh-cow 的 DSH 之间维持一条 WebSocket，
 * 双向发事件（任务完成通知、协作消息、能力变更）。
 *
 * 关键决策：
 *   - **一条双工连接**。谁拨号由 peerId 字典序决定（小的拨），
 *     两侧同时连上时按同一规则裁决，最终收敛到同一条 socket。
 *   - **at-least-once + 去重**。每条事件有 `seq` 与 `msgId`，接收方累计 ack，
 *     发送方按 ack 丢弃；重连后按 ack 续传，不会丢通知。
 *   - **断线可退化**。通道不可用时，任务结果仍可用既有 HTTP 长轮询拿到；
 *     `peer.message` 可以走 `POST /messages` 兜底。
 *   - **心跳**：20s ping，65s 无活动判死并重连（指数退避 + 抖动）。
 */
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { PROTOCOL_VERSION, ROUTE_PREFIX } from './protocol.js';
import { hashJoinPassword, makeJoinProof, verifyJoinProof } from './identity.js';
import { readJson, writeJsonAtomic } from './store.js';
import { acceptUpgrade, connect as wsConnect } from './ws.js';
import { deriveSessionKey, open as openSealed, seal } from './crypto.js';
import { buildMap, childNode, resolveLimits, sanitizeSubtree, selfNode } from './topology.js';

const HEARTBEAT_MS = 20_000;
const DEAD_MS = 65_000;
const TICK_MS = 5_000;
const MAX_OUTBOX = 300;
const SEEN_LIMIT = 512;
const ACK_BATCH_MS = 120;
const CHANNEL_PATH = `${ROUTE_PREFIX}/channel`;

function backoffMs(attempts) {
  const base = Math.min(30_000, 500 * 2 ** Math.min(attempts, 6));
  return Math.round(base * (0.7 + Math.random() * 0.6));
}

/**
 * @param {{
 *   ctx: object,
 *   resolveConfig: () => object,
 *   peers: import('./peers.js').PeerRegistry,
 *   instance: {peerId: string, displayName?: string},
 *   authorize: (token: string) => ({label?: string} | null),
 *   onEvent?: (input: {from: string, event: object}) => void,
 *   logger?: object,
 *   home?: string,
 *   now?: () => number,
 * }} deps
 */
export class Channel {
  constructor({ ctx, resolveConfig, peers, instance, authorize, onEvent, onPeer, onOffline, logger, home, now }) {
    this.ctx = ctx;
    this.resolveConfig = resolveConfig;
    this.peers = peers;
    this.instance = instance;
    this.authorize = authorize;
    this.onEvent = onEvent;
    this.onPeer = onPeer;
    this.onOffline = onOffline;
    this.logger = logger ?? console;
    this.now = now ?? (() => Date.now());
    this.home = home;
    this.conns = new Map();
    this.outbox = new Map();
    this.dial = new Map();
    this.ackTimers = new Map();
    this.timer = null;
    this.stateSaveAt = 0;
    this.loaded = false;
    /** 在途的下级拓扑请求：id -> {resolve, timer, state}。 */
    this.topoPending = new Map();
    /** 拓扑请求自增序号，避免同一毫秒重复。 */
    this.topoSeq = 0;
    /** 每个连接的最近拓扑请求时间戳，用来限速。 */
    this.topoHits = new WeakMap();
  }

  // ── 生命周期 ──────────────────────────────────────────────────

  start() {
    if (this.timer) return this;
    this.#load();
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.timer.unref?.();
    this.tick();
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const timer of this.ackTimers.values()) clearTimeout(timer);
    this.ackTimers.clear();
    for (const state of this.conns.values()) {
      try {
        state.conn.close(1001, 'shutdown');
      } catch {
        state.conn.destroy();
      }
    }
    this.conns.clear();
    this.#saveState(true);
    this.#saveOutbox();
  }

  get endpoint() {
    return CHANNEL_PATH;
  }

  // ── 持久化 ────────────────────────────────────────────────────

  #outboxFile() {
    return join(this.home ?? '', 'cow', 'channel-outbox.json');
  }

  #stateFile() {
    return join(this.home ?? '', 'cow', 'channel-state.json');
  }

  #load() {
    if (this.loaded) return;
    this.loaded = true;
    const outbox = readJson(this.#outboxFile(), null);
    if (outbox?.peers && typeof outbox.peers === 'object') {
      for (const [label, box] of Object.entries(outbox.peers)) {
        if (!Array.isArray(box?.entries)) continue;
        this.outbox.set(label, { nextSeq: Number(box.nextSeq) || box.entries.length + 1, entries: box.entries.slice(-MAX_OUTBOX) });
      }
    }
    this.inboxAck = readJson(this.#stateFile(), null)?.inboundAck ?? {};
  }

  #saveOutbox() {
    const peers = {};
    for (const [label, box] of this.outbox) peers[label] = box;
    try {
      writeJsonAtomic(this.#outboxFile(), { schema: 1, updatedAt: new Date().toISOString(), peers });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 通道发件箱落盘失败: ${error?.message ?? error}`);
    }
  }

  #saveState(force = false) {
    const now = this.now();
    if (!force && now - this.stateSaveAt < 10_000) return;
    this.stateSaveAt = now;
    const peers = {};
    const config = this.resolveConfig();
    for (const peer of this.peers.list()) {
      const state = this.conns.get(peer.label);
      peers[peer.label] = {
        state: state?.ready ? 'connected' : state ? 'connecting' : 'offline',
        since: state?.since ? new Date(state.since).toISOString() : null,
        peerId: state?.peerId ?? peer.peerId ?? '',
        lastError: state?.lastError ?? this.dial.get(peer.label)?.lastError ?? null,
      };
    }
    try {
      writeJsonAtomic(this.#stateFile(), {
        schema: 1,
        updatedAt: new Date().toISOString(),
        enabled: Boolean(config.channelEnabled),
        inboundAck: this.inboxAck ?? {},
        peers,
      });
    } catch {
      /* 状态文件只是给 CLI 看的，失败不影响通道 */
    }
  }

  // ── 对外 API ──────────────────────────────────────────────────

  /** 通道状态（给 cow_peers / CLI 用）。 */
  status(label) {
    const state = this.conns.get(label);
    if (!state) {
      const dialState = this.dial.get(label);
      return { state: 'offline', since: null, peerId: '', lastError: dialState?.lastError ?? null };
    }
    return {
      state: state.ready ? 'connected' : 'connecting',
      since: state.since ? new Date(state.since).toISOString() : null,
      peerId: state.peerId ?? '',
      displayName: state.displayName ?? '',
      node: state.node ?? null,
      direction: state.direction,
      e2e: Boolean(state.e2eKey),
      lastError: state.lastError ?? null,
    };
  }

  /**
   * 把某个连接/发件箱从一个名字挪到另一个名字。
   * 场景：主 DSH 先按临时标识签发授权码，子 DSH 连上来上报实例名后再改名。
   */
  rebind(oldLabel, newLabel) {
    if (!oldLabel || !newLabel || oldLabel === newLabel) return false;
    const state = this.conns.get(oldLabel);
    if (state) {
      this.conns.delete(oldLabel);
      state.label = newLabel;
      this.conns.set(newLabel, state);
    }
    const box = this.outbox.get(oldLabel);
    if (box) {
      this.outbox.delete(oldLabel);
      const existing = this.outbox.get(newLabel);
      this.outbox.set(
        newLabel,
        existing
          ? { nextSeq: Math.max(box.nextSeq, existing.nextSeq), entries: [...box.entries, ...existing.entries] }
          : box,
      );
    }
    const dialState = this.dial.get(oldLabel);
    if (dialState && !this.dial.has(newLabel)) {
      this.dial.delete(oldLabel);
      this.dial.set(newLabel, dialState);
    }
    this.#saveOutbox();
    this.#saveState(true);
    return Boolean(state || box);
  }

  connectedCount() {
    let count = 0;
    for (const state of this.conns.values()) if (state.ready) count += 1;
    return count;
  }

  /**
   * 把 label / peerId / url 解析成当前连接使用的唯一 label。
   * peerId 是稳定身份：改名、重连、显示名冲突后仍能找到同一节点。
   */
  #resolveLabel(target) {
    const raw = String(target ?? '').trim();
    if (!raw) return '';
    if (this.conns.has(raw) || this.outbox.has(raw) || this.dial.has(raw)) return raw;
    const peer = this.peers?.get?.(raw);
    if (peer) return peer.label;
    for (const state of this.conns.values()) {
      if (state.peerId === raw) return state.label;
    }
    return raw;
  }

  /**
   * 向某个 peer 发送一条事件。通道未连接时先入发件箱（等重连），返回 delivered=false。
   * @param {string} target label 或 peerId
   * @param {{type: string, payload?: object}} event
   */
  send(target, { type, payload = {} }) {
    const label = this.#resolveLabel(target);
    if (!label) return { queued: false, delivered: false, reason: 'missing_peer' };
    let box = this.outbox.get(label);
    if (!box) {
      box = { nextSeq: 1, entries: [] };
      this.outbox.set(label, box);
    }
    const seq = box.nextSeq;
    box.nextSeq += 1;
    const entry = {
      seq,
      msgId: `${this.instance.peerId}:${seq}`,
      type,
      at: new Date(this.now()).toISOString(),
      payload,
    };
    box.entries.push(entry);
    if (box.entries.length > MAX_OUTBOX) box.entries.splice(0, box.entries.length - MAX_OUTBOX);
    this.#saveOutbox();

    const state = this.conns.get(label);
    const delivered = Boolean(state?.ready && this.#write(state.conn, this.#wireEvent(entry, state)));
    return { queued: true, delivered, seq, msgId: entry.msgId };
  }

  /** 帧格式：外层 `type` 用于协议分发，业务类型放在 `event` 字段。 */
  #wireEvent(entry, state) {
    const base = { type: 'event', seq: entry.seq, msgId: entry.msgId, at: entry.at };
    if (state?.e2eKey) {
      return { ...base, enc: seal(state.e2eKey, { event: entry.type, payload: entry.payload ?? {} }) };
    }
    return { ...base, event: entry.type, payload: entry.payload ?? {} };
  }

  /**
   * 入站 ack 水位（重连时告诉对端「我已经收到哪一条」）。
   * 历史水位可能记在 label 或 peerId 两个键上（先连上才知道实例 id），两者取最大。
   */
  inboundAck(label, peerId) {
    const knownId = peerId || this.peers?.get?.(label)?.peerId || '';
    const state = this.conns.get(label);
    const stored = Math.max(
      Number(this.inboxAck?.[label] ?? 0),
      knownId ? Number(this.inboxAck?.[knownId] ?? 0) : 0,
    );
    return Math.max(state?.inboundAckSeq ?? 0, stored);
  }

  // ── 服务端：接受 upgrade ──────────────────────────────────────

  handleUpgrade(req, socket, head) {
    const config = this.resolveConfig();
    if (!config.channelEnabled || !config.serverEnabled) {
      socket.destroy();
      return;
    }
    let token = '';
    try {
      const url = new URL(req.url ?? '/', 'http://cow.local');
      const header = String(req.headers?.authorization ?? '');
      token = /^Bearer\s+/i.test(header) ? header.replace(/^Bearer\s+/i, '').trim() : String(url.searchParams.get('token') ?? '');
    } catch {
      socket.destroy();
      return;
    }
    const principal = token ? this.authorize(token) : { kind: 'join', label: '', challenge: true };
    if (!principal) {
      this.logger.warn?.('[dsh-cow] 通道升级被拒绝：token 无效');
      try {
        socket.write('HTTP/1.1 401 Unauthorized\r\nconnection: close\r\n\r\n');
      } catch {
        /* 忽略 */
      }
      socket.destroy();
      return;
    }
    let conn;
    try {
      conn = acceptUpgrade(req, socket, head);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 通道握手失败: ${error?.message ?? error}`);
      return;
    }
    this.#bind(conn, {
      direction: 'in',
      label: principal.label ?? '',
      authenticated: principal.challenge !== true,
      joinAuth: principal.kind === 'join',
    });
  }

  // ── 连接管理 ──────────────────────────────────────────────────

  #bind(conn, { direction, label, authenticated, joinAuth = false, password = '' }) {
    // 共用连接密钥时，hello 之前不知道对方是谁，先用临时标签避免多条 pending 互相顶掉。
    const effectiveLabel = joinAuth && direction === 'in' ? `pending-${Math.random().toString(36).slice(2, 10)}` : label;
    const state = {
      conn,
      direction,
      label: effectiveLabel,
      joinAuth,
      authenticated,
      ready: false,
      peerId: '',
      displayName: '',
      since: this.now(),
      lastSeenAt: this.now(),
      lastPingAt: 0,
      inboundAckSeq: 0,
      outAckSeq: 0,
      seen: new Set(),
      lastError: null,
      password,
      challenge: null,
      e2eKey: null,
      authTimer: null,
    };
    conn.on('message', (text) => this.#onFrame(state, text));
    conn.on('pong', () => {
      state.lastSeenAt = this.now();
    });
    conn.on('close', () => {
      this.#clearAuthTimer(state);
      this.#onClosed(state);
    });
    conn.on('error', (error) => {
      state.lastError = String(error?.message ?? error);
      this.logger.warn?.(`[dsh-cow] 通道错误（${label}）: ${state.lastError}`);
    });
    this.#adopt(state.label, state);
    if (direction === 'in' && !authenticated) {
      this.#beginChallenge(state);
    }
    return state;
  }

  #beginChallenge(state) {
    this.#clearAuthTimer(state);
    state.challenge = {
      nonce: randomBytes(16).toString('hex'),
      salt: String(this.instance.passwordSalt ?? ''),
    };
    // 服务端用自己保存的密码派生值；拨号方会用 password + salt 算出同一个值。
    if (this.instance.passwordHash) {
      try { state.e2eKey = deriveSessionKey(String(this.instance.passwordHash), state.challenge.nonce); } catch { state.e2eKey = null; }
    }
    this.#write(state.conn, { type: 'auth.challenge', nonce: state.challenge.nonce, salt: state.challenge.salt });
    state.authTimer = setTimeout(() => {
      if (state.authenticated) return;
      this.logger.warn?.('[dsh-cow] 认证超时，关闭连接');
      try { state.conn.close(1000, 'auth timeout'); } catch { state.conn.destroy(); }
    }, 10_000);
    state.authTimer.unref?.();
  }

  #clearAuthTimer(state) {
    if (state.authTimer) {
      clearTimeout(state.authTimer);
      state.authTimer = null;
    }
  }

  #sendHello(state, proof) {
    this.#write(state.conn, {
      type: 'hello',
        protocol: PROTOCOL_VERSION,
        peerId: this.instance.peerId,
        // 兼容旧节点：旧版本只读 instanceId 字段。
        instanceId: this.instance.peerId,
        displayName: this.instance.displayName ?? '',
        node: {
          uuid: this.instance.uuid ?? '',
          version: this.instance.version ?? '',
          description: this.instance.description ?? '',
          department: String(this.resolveConfig?.().department ?? ''),
          owner: String(this.resolveConfig?.().owner ?? ''),
          proxyEnabled: Boolean(this.resolveConfig?.().proxyEnabled),
          proxyViaParent: Boolean(this.resolveConfig?.().proxyViaParent),
        },
        proof: proof ?? '',
        enc: state.e2eKey ? 1 : 0,
        ackSeq: this.inboundAck(state.label, ''),
    });
  }

  /** 同一 peer 只保留一条连接：按 peerId 字典序决定保留方向。 */
  #adopt(label, next) {
    const existing = this.conns.get(label);
    if (!existing || existing === next) {
      this.conns.set(label, next);
      return;
    }
    const peerId = next.peerId || existing.peerId || '';
    const preferOut = peerId ? this.instance.peerId < peerId : true;
    const keep = preferOut ? 'out' : 'in';
    const winner = next.direction === keep ? next : existing.direction === keep ? existing : next;
    const loser = winner === next ? existing : next;
    this.conns.set(label, winner);
    try {
      loser.conn.close(1000, 'duplicate connection');
    } catch {
      loser.conn.destroy();
    }
    this.logger.info?.(`[dsh-cow] 通道去重 ${label}：保留 ${winner.direction}，关闭 ${loser.direction}`);
  }

  #onClosed(state) {
    if (this.conns.get(state.label) === state) this.conns.delete(state.label);
    // 连接断了：这条链路上还没回来的拓扑请求立即失败，不要让调用方等到超时。
    for (const [id, pending] of this.topoPending) {
      if (pending.state !== state) continue;
      clearTimeout(pending.timer);
      this.topoPending.delete(id);
      pending.resolve(null);
    }
    if (state.ready) {
      try { this.onOffline?.(state.label); } catch (error) { this.logger.warn?.(`[dsh-cow] 处理对端离线失败：${error?.message ?? error}`); }
    }
    this.#saveState(true);
  }

  #write(conn, frame) {
    try {
      return conn.send(JSON.stringify(frame));
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 通道写失败: ${error?.message ?? error}`);
      return false;
    }
  }

  #peerSeen(label, state) {
    try {
      this.onPeer?.({
        label,
        peerId: state.peerId,
        displayName: state.displayName,
        node: state.node ?? null,
        direction: state.direction,
      });
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 处理对端 hello 失败：${error?.message ?? error}`);
    }
  }

  #onFrame(state, text) {
    let label = state.label;
    state.lastSeenAt = this.now();
    let frame;
    try {
      frame = JSON.parse(String(text ?? ''));
    } catch {
      return;
    }
    if (!frame || typeof frame !== 'object') return;
    if (frame.type === 'auth.challenge') {
      if (state.authenticated) return;
      const verifier = hashJoinPassword(state.password ?? '', String(frame.salt ?? ''));
      const proof = makeJoinProof(verifier, String(frame.nonce ?? ''));
      try { state.e2eKey = deriveSessionKey(verifier, String(frame.nonce ?? '')); } catch { state.e2eKey = null; }
      state.authenticated = true;
      this.#clearAuthTimer(state);
      this.#sendHello(state, proof);
      return;
    }
    switch (frame.type) {
      case 'hello': {
        if (frame.protocol && frame.protocol !== PROTOCOL_VERSION) {
          this.#write(state.conn, { type: 'bye', reason: `protocol mismatch: ${frame.protocol}` });
          state.conn.close(1002, 'protocol mismatch');
          return;
        }
        if (!state.authenticated && state.challenge) {
          if (!verifyJoinProof(this.instance, state.challenge.nonce, String(frame.proof ?? ''))) {
            this.logger.warn?.('[dsh-cow] 通道认证失败：proof 不匹配');
            this.#write(state.conn, { type: 'bye', reason: 'auth_failed' });
            try { state.conn.close(1000, 'auth failed'); } catch { state.conn.destroy(); }
            return;
          }
          state.authenticated = true;
          this.#clearAuthTimer(state);
        }
        state.peerId = String(frame.peerId ?? frame.instanceId ?? '');
        if (state.peerId && state.peerId === this.instance.peerId) {
          this.logger.warn?.('[dsh-cow] 拒绝连接到自身，关闭该长连接');
          try { state.conn.close(1000, 'self connection'); } catch { state.conn.destroy(); }
          return;
        }
        // 每个节点只有直接父子关系：拒绝把「本节点的上级」再当作下级接入。
        const parentInstanceId = String(this.instance.parent?.peerId ?? '');
        if (parentInstanceId && state.peerId === parentInstanceId) {
          this.logger.warn?.('[dsh-cow] 拒绝把上级当作下级接入');
          this.#write(state.conn, { type: 'bye', reason: 'parent_as_child' });
          try { state.conn.close(1000, 'parent as child'); } catch { state.conn.destroy(); }
          return;
        }
        state.displayName = String(frame.displayName ?? '');
        state.node = frame.node ?? state.node ?? null;
        if (state.joinAuth && state.direction === 'in') {
          // 优先按实例 ID 匹配已登记的 peer，保证入站连接挂在 peer.label 上，
          // 而不是临时标签 / peerId（否则主 DSH 侧一直显示离线）。
          const known = this.peers.list().find((peer) => peer.peerId && peer.peerId === state.peerId);
          const desired = String(frame.displayName || frame.peerId || frame.instanceId || '').trim() || state.label;
          // 未登记的节点用 peerId 生成唯一显示名，避免两个同名「主 DSH」互相顶掉连接。
          const next = known?.label || this.peers.uniqueLabel(desired, state.peerId);
          if (next !== state.label) {
            if (this.conns.get(state.label) === state) this.conns.delete(state.label);
            state.label = next;
            label = next;
            this.conns.set(next, state);
          }
        }
        // hello 里带着「拨号方已经收到我哪些事件」的水位：先丢弃已确认的，再补发剩下的。
        state.outAckSeq = Math.max(state.outAckSeq, Number(frame.ackSeq) || 0);
        this.#dropAcked(label, state.outAckSeq);
        if (state.direction === 'in') {
          this.#write(state.conn, {
            type: 'welcome',
            protocol: PROTOCOL_VERSION,
            peerId: this.instance.peerId,
            // 兼容旧节点：旧版本只读 instanceId 字段。
            instanceId: this.instance.peerId,
            displayName: this.instance.displayName ?? '',
            node: {
              uuid: this.instance.uuid ?? '',
              version: this.instance.version ?? '',
              description: this.instance.description ?? '',
              department: String(this.resolveConfig?.().department ?? ''),
              owner: String(this.resolveConfig?.().owner ?? ''),
              proxyEnabled: Boolean(this.resolveConfig?.().proxyEnabled),
              proxyViaParent: Boolean(this.resolveConfig?.().proxyViaParent),
            },
            enc: state.e2eKey ? 1 : 0,
            ackSeq: this.inboundAck(label, state.peerId),
          });
        }
        if (!frame.enc) state.e2eKey = null;
        this.#markReady(label, state);
        this.#adopt(label, state);
        this.#flush(label, state);
        this.#peerSeen(label, state);
        break;
      }
      case 'welcome': {
        if (frame.protocol && frame.protocol !== PROTOCOL_VERSION) {
          state.conn.close(1002, 'protocol mismatch');
          return;
        }
        if (!state.authenticated && state.challenge) {
          if (!verifyJoinProof(this.instance, state.challenge.nonce, String(frame.proof ?? ''))) {
            this.logger.warn?.('[dsh-cow] 通道认证失败：proof 不匹配');
            this.#write(state.conn, { type: 'bye', reason: 'auth_failed' });
            try { state.conn.close(1000, 'auth failed'); } catch { state.conn.destroy(); }
            return;
          }
          state.authenticated = true;
          this.#clearAuthTimer(state);
        }
        state.peerId = String(frame.peerId ?? frame.instanceId ?? '');
        if (state.peerId && state.peerId === this.instance.peerId) {
          this.logger.warn?.('[dsh-cow] 拒绝连接到自身，关闭该长连接');
          try { state.conn.close(1000, 'self connection'); } catch { state.conn.destroy(); }
          return;
        }
        state.displayName = String(frame.displayName ?? '');
        state.node = frame.node ?? state.node ?? null;
        if (!frame.enc) state.e2eKey = null;
        state.outAckSeq = Math.max(state.outAckSeq, Number(frame.ackSeq) || 0);
        this.#markReady(label, state);
        this.#adopt(label, state);
        this.#flush(label, state);
        this.#peerSeen(label, state);
        break;
      }
      case 'event': {
        const seq = Number(frame.seq);
        const msgId = String(frame.msgId ?? '');
        if (!Number.isFinite(seq) || !msgId) return;
        if (state.seen.has(msgId)) {
          this.#scheduleAck(label, state);
          return;
        }
        state.seen.add(msgId);
        if (state.seen.size > SEEN_LIMIT) state.seen.delete(state.seen.values().next().value);
        state.inboundAckSeq = Math.max(state.inboundAckSeq, seq);
        this.inboxAck = this.inboxAck ?? {};
        this.inboxAck[label] = state.inboundAckSeq;
        if (state.peerId) this.inboxAck[state.peerId] = state.inboundAckSeq;
        this.#scheduleAck(label, state);
        let eventType = frame.event ?? frame.eventType;
        let payload = frame.payload ?? {};
        if (frame.enc) {
          if (!state.e2eKey) {
            this.logger.warn?.('[dsh-cow] 收到加密帧但本连接没有会话密钥，已丢弃');
            return;
          }
          try {
            const sealed = openSealed(state.e2eKey, frame.enc);
            eventType = sealed.event;
            payload = sealed.payload ?? {};
          } catch (error) {
            this.logger.warn?.(`[dsh-cow] 加密帧解密失败：${error?.message ?? error}`);
            return;
          }
        }
        try {
          this.onEvent?.({
            from: label,
            peerId: state.peerId,
            event: {
              type: String(eventType ?? ''),
              msgId,
              seq,
              at: frame.at ?? null,
              payload,
            },
          });
        } catch (error) {
          this.logger.warn?.(`[dsh-cow] 处理通道事件失败: ${error?.message ?? error}`);
        }
        break;
      }
      case 'topo.req': {
        void this.#handleTopoReq(state, label, frame);
        break;
      }
      case 'topo.res': {
        this.#handleTopoRes(state, frame);
        break;
      }
      case 'ack': {
        state.outAckSeq = Math.max(state.outAckSeq, Number(frame.seq) || 0);
        this.#dropAcked(label, state.outAckSeq);
        break;
      }
      case 'ping':
        this.#write(state.conn, { type: 'pong', t: frame.t ?? null });
        break;
      case 'pong':
        break;
      case 'bye':
        state.conn.close(1000, String(frame.reason ?? 'bye'));
        break;
      default:
        break;
    }
  }

  // ── 下级拓扑采集 ──────────────────────────────────────────────

  /**
   * 采集「下级方向」拓扑：只向自己的直接下级发 topo.req，绝不向上调查。
   * 返回 { root, nodes, edges, stats, meta }；离线直接下级也会保留在图上。
   */
  async collectTopology(input = {}) {
    const limits = resolveLimits(input);
    const self = {
      peerId: this.instance.peerId,
      displayName: this.instance.displayName,
      version: this.instance.version,
      role: this.instance.role,
      department: String(this.resolveConfig?.().department ?? ''),
      owner: String(this.resolveConfig?.().owner ?? ''),
    };
    if (limits.depth <= 0) return buildMap({ self, children: [], meta: { ...limits, collectedAt: new Date(this.now()).toISOString() } });

    const peers = this.peers.list().filter((peer) => peer.relation !== 'parent');
    let truncated = false;
    const children = await Promise.all(peers.map(async (peer) => {
      const status = this.status(peer.label);
      const base = childNode({ peer, status });
      const connState = this.conns.get(peer.label);
      if (status.state !== 'connected' || !connState?.ready) return base;
      const subtree = await this.#requestTopology(peer.label, connState, limits);
      if (!subtree) return { ...base, stale: true };
      base.children = subtree.children ?? [];
      base.truncated = subtree.truncated === true;
      if (base.truncated) truncated = true;
      return base;
    }));

    return buildMap({
      self,
      children,
      meta: {
        ...limits,
        truncated,
        collectedAt: new Date(this.now()).toISOString(),
      },
    });
  }

  #requestTopology(label, state, limits) {
    if (!state?.ready || !state.conn) return Promise.resolve(null);
    const id = `topo-${this.instance.peerId}-${++this.topoSeq}`;
    const payload = {
      depth: Math.max(0, limits.depth - 1),
      timeoutMs: limits.timeoutMs,
      maxNodes: limits.maxNodes,
    };
    const frame = { type: 'topo.req', id };
    if (state.e2eKey) frame.enc = seal(state.e2eKey, payload);
    else Object.assign(frame, payload);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!this.topoPending.has(id)) return;
        this.topoPending.delete(id);
        resolve(null);
      }, limits.timeoutMs + 150);
      timer.unref?.();
      this.topoPending.set(id, {
        resolve, timer, state,
        remaining: Math.max(0, limits.maxNodes - 1),
        maxDepth: Math.max(0, limits.depth),
      });
      if (!this.#write(state.conn, frame)) {
        clearTimeout(timer);
        this.topoPending.delete(id);
        resolve(null);
      }
    });
  }

  async #handleTopoReq(state, label, frame) {
    const id = String(frame.id ?? '');
    if (!id) return;
    const peer = this.peers.get(label);
    // 只接受“上级问我”的下级采集；子节点不能反向调查父节点。
    if (!peer || peer.relation !== 'parent') return;
    const hit = this.topoHits.get(state);
    const now = this.now();
    if (hit && now - hit.at < 10_000) {
      hit.count += 1;
      if (hit.count > 20) return;
    } else {
      this.topoHits.set(state, { at: now, count: 1 });
    }

    let input = frame;
    if (frame.enc) {
      if (!state.e2eKey) return;
      try { input = openSealed(state.e2eKey, frame.enc); } catch { return; }
    }
    const limits = resolveLimits(input);
    let tree;
    try {
      tree = await this.collectTopology(limits);
    } catch (error) {
      this.logger.warn?.(`[dsh-cow] 采集下级拓扑失败：${error?.message ?? error}`);
      tree = buildMap({ self: selfNode({
        ...this.instance,
        department: String(this.resolveConfig?.().department ?? ''),
        owner: String(this.resolveConfig?.().owner ?? ''),
      }), children: [] });
    }
    const payload = {
      children: tree.root?.children ?? [],
      truncated: tree.meta?.truncated === true,
    };
    const response = { type: 'topo.res', id };
    if (state.e2eKey) response.enc = seal(state.e2eKey, payload);
    else Object.assign(response, payload);
    this.#write(state.conn, response);
  }

  #handleTopoRes(state, frame) {
    const id = String(frame.id ?? '');
    const pending = this.topoPending.get(id);
    if (!pending || pending.state !== state) return;
    clearTimeout(pending.timer);
    this.topoPending.delete(id);
    let payload = frame;
    if (frame.enc) {
      if (!state.e2eKey) return pending.resolve(null);
      try { payload = openSealed(state.e2eKey, frame.enc); } catch { return pending.resolve(null); }
    }
    const sanitized = sanitizeSubtree(
      { id: '__topo_response__', children: Array.isArray(payload.children) ? payload.children : [] },
      {
        remaining: pending.remaining ?? 499,
        maxDepth: pending.maxDepth ?? 8,
        seen: new Set([this.instance.peerId, state.peerId].filter(Boolean)),
      },
    );
    pending.resolve({
      children: sanitized.tree?.children ?? [],
      truncated: payload.truncated === true || sanitized.truncated === true,
    });
  }

  #markReady(label, state) {
    if (state.ready) return;
    state.ready = true;
    state.since = this.now();
    this.conns.set(label, state);
    this.#saveState(true);
    this.logger.info?.(
      `[dsh-cow] 通道已建立：${label}${state.peerId ? ` (${state.peerId})` : ''}（${state.direction}）`,
    );
  }

  #scheduleAck(label, state) {
    if (this.ackTimers.has(label)) return;
    const timer = setTimeout(() => {
      this.ackTimers.delete(label);
      this.#write(state.conn, { type: 'ack', seq: state.inboundAckSeq });
    }, ACK_BATCH_MS);
    timer.unref?.();
    this.ackTimers.set(label, timer);
  }

  #dropAcked(label, ackSeq) {
    const box = this.outbox.get(label);
    if (!box) return;
    const before = box.entries.length;
    box.entries = box.entries.filter((entry) => entry.seq > ackSeq);
    if (box.entries.length !== before) this.#saveOutbox();
  }

  #flush(label, state) {
    const box = this.outbox.get(label);
    if (!box) return;
    for (const entry of box.entries) {
      if (entry.seq <= state.outAckSeq) continue;
      if (!this.#write(state.conn, this.#wireEvent(entry, state))) break;
    }
  }

  // ── 拨号与心跳 ────────────────────────────────────────────────

  #shouldDial(peer) {
    const config = this.resolveConfig();
    if (!config.channelEnabled || config.channelDial === 'never') return false;
    // 组织语义：**只有子 DSH 主动连上级**；主 DSH 从不拨子节点的监听端口。
    if (peer.relation === 'child') return false;
    if (config.channelDial === 'always') return true;
    if (peer.relation === 'parent') return true;
    // 手工登记/旧数据没有上下级关系时，退回按实例 ID 排序，避免双方同时拨号。
    if (!peer.peerId) return true;
    return this.instance.peerId < peer.peerId;
  }

  #dialTarget(peer) {
    try {
      const url = new URL(peer.url);
      url.protocol = url.protocol === 'https:' || url.protocol === 'wss:' ? 'wss:' : 'ws:';
      let path = url.pathname.replace(/\/+$/, '');
      if (!/\/cow\/v1(\/channel)?$/.test(path)) path = `${path}/cow/v1`;
      if (!path.endsWith('/channel')) path = `${path}/channel`;
      url.pathname = path;
      url.search = '';
      url.hash = '';
      return url.toString();
    } catch {
      return '';
    }
  }

  async #dialPeer(peer) {
    const target = this.#dialTarget(peer);
    if (!target) throw new Error(`peer ${peer.label} 的地址不合法：${peer.url}`);
    const conn = await wsConnect({ url: target, timeoutMs: 8_000 });
    this.#bind(conn, { direction: 'out', label: peer.label, authenticated: false, password: peer.token });
    const dialState = this.dial.get(peer.label) ?? { attempts: 0, nextAt: 0 };
    dialState.attempts = 0;
    dialState.nextAt = 0;
    dialState.lastError = null;
    this.dial.set(peer.label, dialState);
  }

  tick() {
    const config = this.resolveConfig();
    if (!config.channelEnabled) return;
    const now = this.now();
    for (const peer of this.peers.list()) {
      const state = this.conns.get(peer.label);
      if (state) {
        if (now - state.lastSeenAt > DEAD_MS) {
          this.logger.warn?.(`[dsh-cow] 通道 ${peer.label} 心跳超时，重建连接`);
          state.conn.destroy();
          this.conns.delete(peer.label);
          continue;
        }
        if (now - state.lastPingAt > HEARTBEAT_MS && state.ready) {
          state.lastPingAt = now;
          this.#write(state.conn, { type: 'ping', t: now });
        }
        continue;
      }
      if (!this.#shouldDial(peer)) continue;
      const dialState = this.dial.get(peer.label) ?? { attempts: 0, nextAt: 0 };
      if (now < dialState.nextAt) continue;
      dialState.attempts += 1;
      dialState.nextAt = now + backoffMs(dialState.attempts);
      this.dial.set(peer.label, dialState);
      void this.#dialPeer(peer).catch((error) => {
        dialState.lastError = String(error?.message ?? error);
        this.logger.debug?.(`[dsh-cow] 拨号 ${peer.label} 失败: ${dialState.lastError}`);
      });
    }
    this.#saveState();
  }

  /** 主动重建某个对端的长连接（地址/密码变更后调用）。 */
  reconnect(label) {
    const state = this.conns.get(label);
    if (state) {
      try { state.conn.close(1000, 'reconnect'); } catch { state.conn.destroy(); }
      this.conns.delete(label);
    }
    const dial = this.dial.get(label);
    if (dial) {
      dial.attempts = 0;
      dial.nextAt = 0;
      dial.lastError = null;
    }
    this.tick();
  }

  /** 供测试与排障：当前所有连接。 */
  connections() {
    return [...this.conns.entries()].map(([label, state]) => ({
      peerName: label,
      direction: state.direction,
      ready: state.ready,
      peerId: state.peerId,
      displayName: state.displayName ?? '',
      node: state.node ?? null,
      e2e: Boolean(state.e2eKey),
      since: state.since ? new Date(state.since).toISOString() : null,
      lastSeenAt: new Date(state.lastSeenAt).toISOString(),
    }));
  }
}
