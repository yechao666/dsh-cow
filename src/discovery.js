/**
 * 局域网主 DSH 发现：纯 Node dgram/os，无第三方依赖。
 *
 * 子端向每个 IPv4 网卡的定向广播地址发送 DISCOVER；主端只在本机监听，
 * 校验请求后用单播 OFFER 回应。发现包不携带密码，也不自动建立连接。
 */
import { createSocket } from 'node:dgram';
import { networkInterfaces } from 'node:os';
import { randomBytes } from 'node:crypto';

export const DISCOVERY_VERSION = 1;
export const DISCOVERY_PORT = 60002;
export const DISCOVERY_TYPE = 'cow.discover';
export const OFFER_TYPE = 'cow.offer';
const MAX_PACKET = 2048;
const MAX_OFFERS = 32;
const RATE_WINDOW_MS = 10_000;
const RATE_LIMIT = 20;

function ipv4ToInt(ip) {
  const parts = String(ip ?? '').split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return 0;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function intToIpv4(value) {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join('.');
}

/** 每个 IPv4 非内网网卡的定向广播地址，最后加 255.255.255.255 兜底。 */
export function broadcastTargets() {
  const targets = new Set(['255.255.255.255']);
  let interfaces = {};
  try { interfaces = networkInterfaces(); } catch { interfaces = {}; }
  for (const list of Object.values(interfaces)) {
    for (const item of list ?? []) {
      if (!item || item.family !== 'IPv4' || item.internal) continue;
      const address = ipv4ToInt(item.address);
      const mask = ipv4ToInt(item.netmask);
      if (!address || !mask) continue;
      const broadcast = (address & mask) | (~mask >>> 0);
      if (broadcast && broadcast !== address) targets.add(intToIpv4(broadcast >>> 0));
    }
  }
  return [...targets];
}

/** 找到与远端同子网的本地 IPv4 地址，用于向该网段广告可达 endpoint。 */
export function localAddressFor(remoteAddress) {
  const remote = ipv4ToInt(remoteAddress);
  if (!remote) return '';
  let interfaces = {};
  try { interfaces = networkInterfaces(); } catch { interfaces = {}; }
  for (const list of Object.values(interfaces)) {
    for (const item of list ?? []) {
      if (!item || item.family !== 'IPv4' || item.internal) continue;
      const address = ipv4ToInt(item.address);
      const mask = ipv4ToInt(item.netmask);
      if ((address & mask) === (remote & mask)) return item.address;
    }
  }
  return '';
}

function parsePacket(buffer) {
  try {
    const value = JSON.parse(Buffer.from(buffer).toString('utf8'));
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function validNonce(value) {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

/**
 * 主端 UDP 发现监听器。
 * @param {{instance: object, resolveConfig: () => object, endpointFor: (remoteAddress: string) => string, logger?: object}} options
 */
export class DiscoveryResponder {
  constructor({ instance, resolveConfig, endpointFor, logger }) {
    this.instance = instance;
    this.resolveConfig = resolveConfig;
    this.endpointFor = endpointFor;
    this.logger = logger ?? console;
    this.socket = null;
    this.port = 0;
    this.startedAt = 0;
    this.requests = 0;
    this.offers = 0;
    this.errors = 0;
    this.lastError = '';
    this.rate = new Map();
    this.cleanupTimer = null;
  }

  async start(port = DISCOVERY_PORT) {
    if (this.socket) return this.status();
    const socket = createSocket({ type: 'udp4', reuseAddr: true });
    socket.on('message', (message, rinfo) => this.#onMessage(message, rinfo));
    socket.on('error', (error) => {
      this.errors += 1;
      this.lastError = String(error?.message ?? error);
      this.logger.warn?.(`[dsh-cow] 局域网发现监听错误：${this.lastError}`);
    });
    await new Promise((resolve, reject) => {
      socket.once('error', reject);
      socket.bind(port, '0.0.0.0', () => {
        socket.off('error', reject);
        resolve();
      });
    });
    this.socket = socket;
    this.port = socket.address().port;
    this.startedAt = Date.now();
    this.cleanupTimer = setInterval(() => this.#cleanupRate(), 60_000);
    this.cleanupTimer.unref?.();
    this.logger.info?.(`[dsh-cow] 局域网发现监听 UDP 0.0.0.0:${this.port}`);
    return this.status();
  }

  async stop() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.cleanupTimer = null;
    this.rate.clear();
    const socket = this.socket;
    this.socket = null;
    this.port = 0;
    if (!socket) return;
    await new Promise((resolve) => {
      try { socket.close(() => resolve()); } catch { resolve(); }
      setTimeout(resolve, 500).unref?.();
    });
  }

  #cleanupRate() {
    const cutoff = Date.now() - RATE_WINDOW_MS;
    for (const [address, entry] of this.rate) {
      if (entry.at < cutoff) this.rate.delete(address);
    }
  }

  #allowed(address) {
    const now = Date.now();
    const entry = this.rate.get(address);
    if (!entry || now - entry.at > RATE_WINDOW_MS) {
      this.rate.set(address, { at: now, count: 1 });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_LIMIT;
  }

  #onMessage(message, rinfo) {
    if (!message || message.length > MAX_PACKET) return;
    const config = this.resolveConfig();
    if (!config.discoveryEnabled) return;
    if (!this.#allowed(rinfo.address)) return;
    const packet = parsePacket(message);
    if (!packet || packet.v !== DISCOVERY_VERSION || packet.type !== DISCOVERY_TYPE || !validNonce(packet.nonce)) return;
    if (packet.peerId && packet.peerId === this.instance.peerId) return;
    this.requests += 1;
    let endpoint = '';
    try { endpoint = String(this.endpointFor(rinfo.address) ?? '').trim(); } catch (error) {
      this.lastError = String(error?.message ?? error);
      return;
    }
    if (!endpoint) return;
    const offer = {
      v: DISCOVERY_VERSION,
      type: OFFER_TYPE,
      nonce: packet.nonce,
      peerId: this.instance.peerId,
      displayName: this.instance.displayName || this.instance.peerId,
      version: this.instance.version || '',
      endpoint,
      passwordRequired: Boolean(this.instance.passwordHash),
    };
    const data = Buffer.from(JSON.stringify(offer));
    if (data.length > MAX_PACKET || !this.socket) return;
    this.socket.send(data, rinfo.port, rinfo.address, (error) => {
      if (error) {
        this.errors += 1;
        this.lastError = String(error?.message ?? error);
        return;
      }
      this.offers += 1;
    });
  }

  status() {
    return {
      running: Boolean(this.socket),
      port: this.port,
      requests: this.requests,
      offers: this.offers,
      errors: this.errors,
      lastError: this.lastError,
      startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : '',
    };
  }
}

/**
 * 子端扫描：广播一次/多次，收集主端 OFFER。
 * @param {{port?: number, timeoutMs?: number, selfPeerId?: string, logger?: object}} options
 */
export async function scanForMain({ port = DISCOVERY_PORT, timeoutMs = 3000, selfPeerId = '', logger } = {}) {
  const wait = Math.max(500, Math.min(10_000, Number(timeoutMs) || 3000));
  const nonce = randomBytes(12).toString('hex');
  const socket = createSocket({ type: 'udp4' });
  const offers = new Map();
  const targets = broadcastTargets();
  const payload = Buffer.from(JSON.stringify({
    v: DISCOVERY_VERSION,
    type: DISCOVERY_TYPE,
    nonce,
    peerId: selfPeerId,
  }));
  try { socket.setBroadcast(true); } catch { /* 某些平台可能不支持 */ }
  socket.on('message', (message, rinfo) => {
    if (!message || message.length > MAX_PACKET) return;
    const packet = parsePacket(message);
    if (!packet || packet.v !== DISCOVERY_VERSION || packet.type !== OFFER_TYPE) return;
    if (packet.nonce !== nonce) return;
    if (!packet.endpoint || !packet.peerId || (selfPeerId && packet.peerId === selfPeerId)) return;
    const key = `${packet.peerId}\n${packet.endpoint}`;
    if (!offers.has(key)) {
      offers.set(key, {
        peerId: String(packet.peerId),
        displayName: String(packet.displayName || packet.peerId),
        version: String(packet.version || ''),
        endpoint: String(packet.endpoint),
        passwordRequired: Boolean(packet.passwordRequired),
        address: rinfo.address,
        at: new Date().toISOString(),
      });
    }
  });
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.bind(0, '0.0.0.0', () => {
      socket.off('error', reject);
      resolve();
    });
  });
  const send = () => {
    for (const target of targets) {
      try {
        socket.send(payload, port, target, (error) => {
          if (error) logger?.debug?.(`[dsh-cow] 发现广播失败 ${target}:${port}：${error.message}`);
        });
      } catch { /* 单个网卡失败不影响其它 */ }
    }
  };
  send();
  const timer = setInterval(send, 400);
  timer.unref?.();
  await new Promise((resolve) => setTimeout(resolve, wait));
  clearInterval(timer);
  await new Promise((resolve) => {
    try { socket.close(() => resolve()); } catch { resolve(); }
    setTimeout(resolve, 300).unref?.();
  });
  return [...offers.values()].slice(0, MAX_OFFERS);
}
