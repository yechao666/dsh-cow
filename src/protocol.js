/**
 * 线协议常量与错误码。
 *
 * 所有端点都在 `<base>/cow/v1` 下；跨实例业务全部是 WebSocket 消息
 * （msg.dispatch / msg.complete / msg.ask / msg.answer / file.*）。
 */

export const PROTOCOL_VERSION = 'cow/v1';
export const ROUTE_PREFIX = '/cow/v1';

export const LIMITS = {
  messageBytes: 64 * 1024,
  title: 200,
  messageId: 96,
};

export const ERROR_STATUS = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unavailable: 503,
  internal: 500,
};

export class ProtocolError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ProtocolError';
    this.code = code;
    this.details = details;
    this.status = ERROR_STATUS[code] ?? 500;
  }
}

export function errorBody(code, message, details) {
  return { error: { code, message, details: details ?? null } };
}

/** 从 Authorization / X-Cow-Token 里取 bearer token。 */
export function readBearerToken(headers) {
  const auth = headers?.authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  const header = headers?.['x-cow-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return '';
}
