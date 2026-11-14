/**
 * 线协议：版本、错误码、请求体校验。
 *
 * 所有端点都在 `<base>/cow/v1` 下。协议只传 JSON，不传二进制；
 * 任务结果是一段文本摘要，文件留在远端工作目录里（远端路径写进结果）。
 */

export const PROTOCOL_VERSION = 'cow/v1';
export const ROUTE_PREFIX = '/cow/v1';

export const LIMITS = {
  promptBytes: 64 * 1024,
  contextBytes: 16 * 1024,
  title: 200,
  messageBytes: 32 * 1024,
  callerField: 200,
  taskId: 64,
};

export const ERROR_STATUS = {
  invalid_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  too_many_tasks: 429,
  upgrade_required: 426,
  internal: 500,
  unavailable: 503,
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

function fail(code, message) {
  return { ok: false, code, message };
}

function text(value, field, maxBytes) {
  if (typeof value !== 'string') return fail('invalid_request', `${field} 必须是字符串`);
  if (!value.trim()) return fail('invalid_request', `${field} 不能为空`);
  const bytes = Buffer.byteLength(value, 'utf8');
  if (bytes > maxBytes) return fail('payload_too_large', `${field} 超过 ${maxBytes} 字节`);
  return { ok: true, value };
}

export function validateTaskId(value) {
  const id = String(value ?? '');
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return { ok: false, code: 'invalid_request', message: 'taskId 不合法' };
  return { ok: true, value: id };
}

/**
 * 校验 POST /tasks 的请求体。
 * @returns {{ok: true, value: object} | {ok: false, code: string, message: string}}
 */
export function validateCreateTask(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_request', '请求体必须是 JSON 对象');
  const prompt = text(body.prompt, 'prompt', LIMITS.promptBytes);
  if (!prompt.ok) return prompt;

  let title = '';
  if (body.title !== undefined && body.title !== null) {
    if (typeof body.title !== 'string') return fail('invalid_request', 'title 必须是字符串');
    title = body.title.trim().slice(0, LIMITS.title);
  }

  let cwd = '';
  if (body.cwd !== undefined && body.cwd !== null) {
    if (typeof body.cwd !== 'string') return fail('invalid_request', 'cwd 必须是字符串');
    cwd = body.cwd.trim();
    if (cwd.length > 4096) return fail('invalid_request', 'cwd 过长');
  }

  let workspaceName = '';
  if (body.workspaceName !== undefined && body.workspaceName !== null) {
    if (typeof body.workspaceName !== 'string') return fail('invalid_request', 'workspaceName 必须是字符串');
    workspaceName = body.workspaceName.trim().slice(0, 200);
  }

  let context = '';
  if (body.context !== undefined && body.context !== null) {
    if (typeof body.context !== 'string') return fail('invalid_request', 'context 必须是字符串');
    context = body.context;
    if (Buffer.byteLength(context, 'utf8') > LIMITS.contextBytes) return fail('payload_too_large', 'context 过大');
  }

  const mode = body.mode === 'async' ? 'async' : 'wait';
  let timeoutSec;
  if (body.timeoutSec !== undefined && body.timeoutSec !== null) {
    const value = Number(body.timeoutSec);
    if (!Number.isFinite(value) || value <= 0) return fail('invalid_request', 'timeoutSec 必须是正数');
    timeoutSec = Math.round(value);
  }

  let chain = [];
  if (body.chain !== undefined && body.chain !== null) {
    if (!Array.isArray(body.chain) || body.chain.length > 32) return fail('invalid_request', 'chain 必须是不超过 32 项的数组');
    for (const item of body.chain) {
      if (typeof item !== 'string' || item.length === 0 || item.length > 64) return fail('invalid_request', 'chain 里每一项都是实例 id 字符串');
    }
    chain = [...body.chain];
  }

  let taskId = '';
  if (body.taskId !== undefined && body.taskId !== null) {
    const checked = validateTaskId(body.taskId);
    if (!checked.ok) return checked;
    taskId = checked.value;
  }

  let caller = null;
  if (body.caller && typeof body.caller === 'object') {
    const read = (key) => (typeof body.caller[key] === 'string' ? body.caller[key].slice(0, LIMITS.callerField) : '');
    caller = { instanceId: read('instanceId'), displayName: read('displayName'), sessionId: read('sessionId') };
  }

  return { ok: true, value: { taskId, prompt: prompt.value, title, cwd, workspaceName, context, mode, timeoutSec, caller, chain } };
}

/** 校验 POST /tasks/:id/messages 的请求体。 */
export function validateMessage(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_request', '请求体必须是 JSON 对象');
  const message = text(body.message, 'message', LIMITS.messageBytes);
  if (!message.ok) return message;
  let timeoutSec;
  if (body.timeoutSec !== undefined && body.timeoutSec !== null) {
    const value = Number(body.timeoutSec);
    if (!Number.isFinite(value) || value <= 0) return fail('invalid_request', 'timeoutSec 必须是正数');
    timeoutSec = Math.round(value);
  }
  return { ok: true, value: { message: message.value, timeoutSec } };
}

/** 从 Authorization / X-Co-Dsh-Token 里取 bearer token。 */
export function readBearerToken(headers) {
  const auth = headers?.authorization;
  if (typeof auth === 'string' && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, '').trim();
  const header = headers?.['x-cow-token'];
  if (typeof header === 'string' && header.trim()) return header.trim();
  return '';
}
