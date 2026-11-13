/**
 * 登记串（enrollment string）编解码。
 *
 * 形如 `cods1.<base64url(JSON)>`，由「被登记的一方」生成并交给人复制粘贴，
 * 本插件永远不把它交给模型 —— 里面是访问 token。
 *
 * 载荷：{ v: 1, u: baseUrl, t: token, l: label, i: instanceId }
 */

export const ENROLLMENT_PREFIX = 'cods1.';
export const TOKEN_PREFIX = 'cods_';

const MAX_LABEL = 120;
const URL_PROTOCOLS = new Set(['http:', 'https:']);

export class EnrollmentError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'EnrollmentError';
    this.code = code;
  }
}

function toBase64Url(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function fromBase64Url(text) {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new EnrollmentError('invalid_payload', '登记串内容不是合法的 base64url');
  try {
    return Buffer.from(text, 'base64url').toString('utf8');
  } catch {
    throw new EnrollmentError('invalid_payload', '登记串无法解码');
  }
}

/** 校验并规范化一个公网可达的 endpoint URL。 */
export function normalizeEndpoint(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new EnrollmentError('invalid_url', '缺少远端地址');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new EnrollmentError('invalid_url', `不是合法 URL：${raw}`);
  }
  if (!URL_PROTOCOLS.has(url.protocol)) throw new EnrollmentError('invalid_url', '远端地址必须是 http 或 https');
  if (url.username || url.password) throw new EnrollmentError('invalid_url', '远端地址不能内嵌用户名或密码');
  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/+$/, '');
}

export function isPeerToken(value) {
  return typeof value === 'string' && new RegExp(`^${TOKEN_PREFIX}[A-Za-z0-9_-]{16,}$`).test(value);
}

/**
 * @param {{url: string, token: string, label?: string, instanceId?: string}} input
 * @returns {string}
 */
export function encodeEnrollment(input) {
  const url = normalizeEndpoint(input?.url);
  const token = String(input?.token ?? '').trim();
  if (!isPeerToken(token)) throw new EnrollmentError('invalid_token', 'token 格式不合法');
  const payload = { v: 1, u: url, t: token };
  const label = String(input?.label ?? '').trim();
  if (label) payload.l = label.slice(0, MAX_LABEL);
  const instanceId = String(input?.instanceId ?? '').trim();
  if (instanceId) payload.i = instanceId.slice(0, MAX_LABEL);
  return ENROLLMENT_PREFIX + toBase64Url(JSON.stringify(payload));
}

/** 生成一条可直接粘贴的登记 URL：`<endpoint>?token=…`（设置页优先用它）。 */
export function buildEnrollmentUrl({ endpoint, token, key, label, instanceId, orgId, parentId }) {
  const normalized = normalizeEndpoint(endpoint);
  const url = new URL(normalized.includes('/cow/v1') ? normalized : `${normalized}/cow/v1`);
  if (key) url.searchParams.set('key', String(key));
  else if (token) url.searchParams.set('token', String(token));
  if (label) url.searchParams.set('label', String(label));
  if (instanceId) url.searchParams.set('instance', String(instanceId));
  if (parentId) url.searchParams.set('parent', String(parentId));
  return url.toString();
}

/**
 * 解析登记 URL（可带 `?token=`），也接受只有 base 地址的写法。
 * @returns {{endpoint: string, token: string, label: string, instanceId: string}}
 */
export function parseEnrollmentUrl(input) {
  const raw = String(input ?? '').trim();
  if (!raw) throw new EnrollmentError('empty', '地址为空');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new EnrollmentError('invalid_url', `不是合法 URL：${raw}`);
  }
  if (!URL_PROTOCOLS.has(url.protocol)) throw new EnrollmentError('invalid_url', '地址必须是 http 或 https');
  const token = String(url.searchParams.get('token') ?? '');
  const key = String(url.searchParams.get('key') ?? '');
  const password = String(url.searchParams.get('password') ?? '');
  const label = String(url.searchParams.get('label') ?? '');
  const instanceId = String(url.searchParams.get('instance') ?? '');
  const orgId = String(url.searchParams.get('org') ?? '');
  const parentId = String(url.searchParams.get('parent') ?? '');
  url.searchParams.delete('token');
  url.searchParams.delete('key');
  url.searchParams.delete('password');
  url.searchParams.delete('label');
  url.searchParams.delete('instance');
  url.searchParams.delete('org');
  url.searchParams.delete('parent');
  url.hash = '';
  let path = url.pathname.replace(/\/+$/, '');
  if (!path.endsWith('/cow/v1')) path = `${path}/cow/v1`;
  url.pathname = path;
  const endpoint = url.toString().replace(/\/+$/, '');
  return { endpoint, token, key, password, label, instanceId, orgId, parentId };
}

/**
 * 解析人粘贴进来的登记串。
 * @param {string} text
 * @returns {{url: string, token: string, label: string, instanceId: string}}
 */
export function decodeEnrollment(text) {
  const raw = String(text ?? '').trim();
  if (!raw) throw new EnrollmentError('empty', '登记串为空');
  if (!raw.startsWith(ENROLLMENT_PREFIX)) {
    throw new EnrollmentError('invalid_prefix', `登记串必须以 ${ENROLLMENT_PREFIX} 开头`);
  }
  const json = fromBase64Url(raw.slice(ENROLLMENT_PREFIX.length));
  let payload;
  try {
    payload = JSON.parse(json);
  } catch {
    throw new EnrollmentError('invalid_payload', '登记串内容不是合法 JSON');
  }
  if (!payload || typeof payload !== 'object') throw new EnrollmentError('invalid_payload', '登记串内容为空');
  if (payload.v !== 1) throw new EnrollmentError('unsupported_version', `不支持的登记串版本：${String(payload.v)}`);
  const url = normalizeEndpoint(payload.u);
  const token = String(payload.t ?? '');
  if (!isPeerToken(token)) throw new EnrollmentError('invalid_token', '登记串里的 token 不合法');
  return {
    url,
    token,
    label: String(payload.l ?? '').trim().slice(0, MAX_LABEL),
    instanceId: String(payload.i ?? '').trim().slice(0, MAX_LABEL),
  };
}
