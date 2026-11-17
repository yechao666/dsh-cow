/**
 * 子 DSH 出网代理的出口策略。
 *
 * 默认只允许公网 HTTP/HTTPS（80/443），禁止环回、私网、链路本地和组播地址；
 * 主端是“出口”，不能被下级当成跳板访问主端自己的内网服务。
 * 域名白名单只做主机匹配，端口仍受 allowedPorts 约束。
 */
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export const DEFAULT_PROXY_PORTS = [80, 443];

export function parseAllowHosts(value) {
  return String(value ?? '')
    .split(/[\n,，]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function ipv4ToInt(address) {
  return address.split('.').reduce((sum, part) => ((sum << 8) + Number(part)) >>> 0, 0) >>> 0;
}

function inV4Range(address, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(address) & mask) === (ipv4ToInt(base) & mask);
}

/** 环回、私网、链路本地、保留/组播地址一律视为不可出站。 */
export function isPrivateAddress(address) {
  const text = String(address ?? '').trim();
  const family = isIP(text);
  if (family === 4) {
    return (
      inV4Range(text, '0.0.0.0', 8) ||
      inV4Range(text, '10.0.0.0', 8) ||
      inV4Range(text, '100.64.0.0', 10) ||
      inV4Range(text, '127.0.0.0', 8) ||
      inV4Range(text, '169.254.0.0', 16) ||
      inV4Range(text, '172.16.0.0', 12) ||
      inV4Range(text, '192.0.0.0', 24) ||
      inV4Range(text, '192.0.2.0', 24) ||
      inV4Range(text, '192.168.0.0', 16) ||
      inV4Range(text, '198.18.0.0', 15) ||
      inV4Range(text, '198.51.100.0', 24) ||
      inV4Range(text, '203.0.113.0', 24) ||
      inV4Range(text, '224.0.0.0', 4) ||
      inV4Range(text, '240.0.0.0', 4)
    );
  }
  if (family === 6) {
    const lower = text.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10
    if (/^ff/.test(lower)) return true; // multicast
    if (lower.startsWith('::ffff:')) return isPrivateAddress(lower.slice(7));
    return false;
  }
  return true;
}

export function hostMatches(host, patterns) {
  const target = String(host ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!target) return false;
  for (const raw of patterns) {
    const pattern = String(raw).trim().toLowerCase().replace(/\.$/, '');
    if (!pattern) continue;
    if (pattern === target) return true;
    if (pattern.startsWith('*.')) {
      const suffix = pattern.slice(1);
      if (target.endsWith(suffix) && target.length > suffix.length) return true;
    } else if (pattern.startsWith('.')) {
      if (target.endsWith(pattern) && target.length > pattern.length) return true;
    }
  }
  return false;
}

export function assertTargetShape({ host, port, allowHosts = [], allowPrivate = false, allowedPorts = DEFAULT_PROXY_PORTS }) {
  const target = String(host ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!target || target.includes('/') || target.includes('\\') || target.length > 253) {
    throw new Error('代理目标主机不合法');
  }
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || !allowedPorts.includes(numericPort)) {
    throw new Error(`代理端口不允许：${port}（只允许 ${allowedPorts.join('/')}）`);
  }
  if (allowHosts.length > 0 && !hostMatches(target, allowHosts)) {
    throw new Error(`代理目标不在白名单：${target}`);
  }
  if (allowHosts.length === 0 && isIP(target) && isPrivateAddress(target) && !allowPrivate) {
    throw new Error(`代理目标被私网策略拒绝：${target}`);
  }
  return { host: target, port: numericPort };
}

/**
 * 解析并校验目标。所有解析结果都要通过私网检查，避免 DNS rebinding。
 * @returns {Promise<{host: string, port: number, address: string, family: number}>}
 */
export async function resolveProxyTarget({ host, port, allowHosts = [], allowPrivate = false, allowedPorts = DEFAULT_PROXY_PORTS }) {
  const shape = assertTargetShape({ host, port, allowHosts, allowPrivate, allowedPorts });
  const target = shape.host;
  let addresses = [];
  if (isIP(target)) {
    addresses = [{ address: target, family: isIP(target) }];
  } else {
    addresses = await lookup(target, { all: true, verbatim: true });
  }
  if (!addresses.length) throw new Error(`无法解析代理目标：${target}`);
  for (const item of addresses) {
    if (isPrivateAddress(item.address) && !allowPrivate) {
      throw new Error(`代理目标解析到私网地址，已拒绝：${target}`);
    }
    if (allowPrivate && allowHosts.length === 0) {
      throw new Error('允许私网代理时必须配置 allowHosts 白名单');
    }
    if (isPrivateAddress(item.address) && allowPrivate && !hostMatches(target, allowHosts)) {
      throw new Error(`私网代理目标不在白名单：${target}`);
    }
  }
  const chosen = addresses[0];
  return { host: target, port: shape.port, address: chosen.address, family: chosen.family };
}
