/**
 * 最小可用的 WebSocket（RFC 6455）实现，零依赖。
 *
 * dsh-cow 需要在插件内部建立「长连接」，但不想给插件塞一个 ws 依赖：
 * 这里只实现插件自己用得到的子集 —— 握手、文本帧、分片、ping/pong、close。
 * 不支持扩展（permessage-deflate）、二进制消息会以文本解码、帧大小有上限。
 *
 * 服务端通过 `ctx.webServer.registerUpgrade({path, handler})` 或自建
 * `node:http` 的 `'upgrade'` 事件调用 `acceptUpgrade()`；客户端调用 `connect()`。
 */
import { createHash, randomBytes } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';

export const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export const MAX_FRAME_BYTES = 512 * 1024;

export const OPCODE = {
  CONT: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xa,
};

export class WebSocketError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
  }
}

/** 计算 `Sec-WebSocket-Accept`。 */
export function acceptKey(key) {
  return createHash('sha1').update(`${String(key ?? '').trim()}${WS_GUID}`, 'utf8').digest('base64');
}

function maskPayload(payload, mask) {
  const out = Buffer.allocUnsafe(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    out[index] = payload[index] ^ mask[index & 3];
  }
  return out;
}

/**
 * 编码一帧。客户端发出的帧必须掩码（masked=true），服务端不掩码。
 */
export function encodeFrame({ opcode = OPCODE.TEXT, payload = Buffer.alloc(0), fin = true, masked = false } = {}) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload), 'utf8');
  const length = data.length;
  let header;
  if (length < 126) {
    header = Buffer.alloc(2);
    header[1] = length;
  } else if (length < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(length), 2);
  }
  header[0] = (fin ? 0x80 : 0x00) | opcode;
  if (!masked) return Buffer.concat([header, data]);
  header[1] |= 0x80;
  const key = randomBytes(4);
  return Buffer.concat([header, key, maskPayload(data, key)]);
}

/**
 * 增量帧解析器。`expectMasked` 表示入站帧是否需要掩码（服务端为 true）。
 * 返回的 push(chunk) 会产出完整消息帧数组（分片已合并）。
 */
export function createFrameParser({ expectMasked = false, maxPayload = MAX_FRAME_BYTES } = {}) {
  let buffer = Buffer.alloc(0);
  let fragments = [];
  let fragmentOpcode = 0;
  let fragmentBytes = 0;

  function take(count) {
    return buffer.subarray(0, count);
  }

  return {
    push(chunk) {
      buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);
      const frames = [];
      for (;;) {
        if (buffer.length < 2) break;
        const first = buffer[0];
        const second = buffer[1];
        const fin = (first & 0x80) !== 0;
        if ((first & 0x70) !== 0) throw new WebSocketError('protocol_error', 'RSV 位不为 0（不支持扩展）');
        const opcode = first & 0x0f;
        const masked = (second & 0x80) !== 0;
        let length = second & 0x7f;
        let offset = 2;
        if (length === 126) {
          if (buffer.length < 4) break;
          length = buffer.readUInt16BE(2);
          offset = 4;
        } else if (length === 127) {
          if (buffer.length < 10) break;
          const big = buffer.readBigUInt64BE(2);
          if (big > BigInt(maxPayload)) throw new WebSocketError('message_too_big', `帧长度超过 ${maxPayload} 字节`);
          length = Number(big);
          offset = 10;
        }
        if (length > maxPayload) throw new WebSocketError('message_too_big', `帧长度超过 ${maxPayload} 字节`);
        const maskLength = masked ? 4 : 0;
        if (buffer.length < offset + maskLength + length) break;
        const mask = masked ? buffer.subarray(offset, offset + 4) : null;
        let payload = Buffer.from(buffer.subarray(offset + maskLength, offset + maskLength + length));
        buffer = buffer.subarray(offset + maskLength + length);
        if (masked) {
          if (!expectMasked) throw new WebSocketError('protocol_error', '服务端不应收到掩码帧');
          payload = maskPayload(payload, mask);
        } else if (expectMasked) {
          throw new WebSocketError('protocol_error', '客户端帧必须掩码');
        }

        const isControl = opcode >= 0x8;
        if (isControl) {
          if (!fin) throw new WebSocketError('protocol_error', '控制帧不能分片');
          if (payload.length > 125) throw new WebSocketError('protocol_error', '控制帧载荷过长');
          if (opcode !== OPCODE.CLOSE && opcode !== OPCODE.PING && opcode !== OPCODE.PONG) {
            throw new WebSocketError('protocol_error', `未知控制帧 ${opcode}`);
          }
          frames.push({ opcode, payload, fin: true });
          continue;
        }
        if (opcode === OPCODE.CONT) {
          if (fragmentOpcode === 0) throw new WebSocketError('protocol_error', '没有可续接的分片');
          fragmentBytes += payload.length;
          if (fragmentBytes > maxPayload) throw new WebSocketError('message_too_big', '分片消息过大');
          fragments.push(payload);
          if (fin) {
            frames.push({ opcode: fragmentOpcode, payload: Buffer.concat(fragments), fin: true });
            fragments = [];
            fragmentOpcode = 0;
            fragmentBytes = 0;
          }
          continue;
        }
        if (opcode === OPCODE.TEXT || opcode === OPCODE.BINARY) {
          if (fragmentOpcode !== 0) throw new WebSocketError('protocol_error', '上一组分片尚未结束');
          if (fin) {
            frames.push({ opcode, payload, fin: true });
          } else {
            fragmentOpcode = opcode;
            fragments = [payload];
            fragmentBytes = payload.length;
          }
          continue;
        }
        throw new WebSocketError('protocol_error', `未知帧类型 ${opcode}`);
      }
      return frames;
    },
    get buffered() {
      return buffer.length;
    },
  };
}

const HEADER_LIMIT = 16 * 1024;

/**
 * 把一个已升级的 socket 包装成连接对象。
 */
function wrapSocket({ socket, head, isClient, maxPayload = MAX_FRAME_BYTES }) {
  const parser = createFrameParser({ expectMasked: !isClient, maxPayload });
  const handlers = { message: new Set(), close: new Set(), error: new Set(), pong: new Set() };
  let closed = false;

  const on = (name, fn) => {
    handlers[name].add(fn);
    return () => handlers[name].delete(fn);
  };
  const emit = (name, value) => {
    for (const fn of [...handlers[name]]) {
      try {
        fn(value);
      } catch {
        /* 监听器异常不影响连接本身 */
      }
    }
  };
  const sendFrame = (opcode, payload) => {
    if (closed) return false;
    try {
      socket.write(encodeFrame({ opcode, payload, masked: isClient }));
      return true;
    } catch (error) {
      emit('error', error);
      return false;
    }
  };

  const connection = {
    get closed() {
      return closed;
    },
    on,
    send(text) {
      return sendFrame(OPCODE.TEXT, Buffer.isBuffer(text) ? text : Buffer.from(String(text), 'utf8'));
    },
    ping(payload = Buffer.alloc(0)) {
      return sendFrame(OPCODE.PING, payload);
    },
    close(code = 1000, reason = '') {
      if (closed) return;
      const reasonBytes = Buffer.from(String(reason), 'utf8').subarray(0, 120);
      const payload = Buffer.alloc(2 + reasonBytes.length);
      payload.writeUInt16BE(code, 0);
      reasonBytes.copy(payload, 2);
      sendFrame(OPCODE.CLOSE, payload);
      closed = true;
      socket.end();
    },
    destroy() {
      closed = true;
      socket.destroy();
    },
  };

  const handleFrame = (frame) => {
    if (frame.opcode === OPCODE.TEXT || frame.opcode === OPCODE.BINARY) {
      emit('message', frame.payload.toString('utf8'));
      return;
    }
    if (frame.opcode === OPCODE.PING) {
      sendFrame(OPCODE.PONG, frame.payload);
      return;
    }
    if (frame.opcode === OPCODE.PONG) {
      emit('pong');
      return;
    }
    if (frame.opcode === OPCODE.CLOSE) {
      connection.close(1000, '');
      emit('close', { code: 1000, reason: 'peer close' });
    }
  };

  socket.on('data', (chunk) => {
    try {
      for (const frame of parser.push(chunk)) handleFrame(frame);
    } catch (error) {
      emit('error', error);
      connection.destroy();
    }
  });
  socket.on('error', (error) => emit('error', error));
  socket.on('close', () => {
    if (closed) return;
    closed = true;
    emit('close', { code: 1006, reason: 'socket closed' });
  });
  socket.setNoDelay?.(true);
  if (head && head.length > 0) {
    // 握手响应同一包里的帧可能先于调用方注册监听器到达：延后一个微任务再分发。
    setImmediate(() => {
      try {
        for (const frame of parser.push(head)) handleFrame(frame);
      } catch (error) {
        emit('error', error);
        connection.destroy();
      }
    });
  }
  return connection;
}

function rejectUpgrade(socket, status, message) {
  const body = `${message}\n`;
  try {
    socket.write(`HTTP/1.1 ${status} ${message}\r\nconnection: close\r\ncontent-type: text/plain\r\ncontent-length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  } catch {
    /* 忽略 */
  }
  socket.destroy();
}

/**
 * 服务端：接受一个 upgrade 请求。
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:stream').Duplex} socket
 * @param {Buffer} head
 * @returns {ReturnType<typeof wrapSocket>}
 */
export function acceptUpgrade(req, socket, head) {
  const key = String(req?.headers?.['sec-websocket-key'] ?? '').trim();
  const upgrade = String(req?.headers?.upgrade ?? '').toLowerCase();
  const version = String(req?.headers?.['sec-websocket-version'] ?? '');
  if (req?.method !== 'GET' || !upgrade.includes('websocket')) {
    rejectUpgrade(socket, 400, 'Bad Request');
    throw new WebSocketError('bad_request', '不是合法的 WebSocket 升级请求');
  }
  if (!key || version !== '13') {
    rejectUpgrade(socket, 426, 'Upgrade Required');
    throw new WebSocketError('bad_request', '缺少 Sec-WebSocket-Key 或版本不是 13');
  }
  socket.write(
    [
      'HTTP/1.1 101 Switching Protocols',
      'upgrade: websocket',
      'connection: Upgrade',
      `sec-websocket-accept: ${acceptKey(key)}`,
      '\r\n',
    ].join('\r\n'),
  );
  return wrapSocket({ socket, head, isClient: false });
}

/**
 * 客户端：向远端发起 WebSocket 连接。
 * @param {{url: string, headers?: Record<string,string>, timeoutMs?: number}} options
 * @returns {Promise<ReturnType<typeof wrapSocket>>}
 */
export function connect({ url, headers = {}, timeoutMs = 10_000 }) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      reject(new WebSocketError('bad_url', `不是合法 WebSocket 地址：${url}`));
      return;
    }
    const secure = parsed.protocol === 'wss:';
    const requestFn = secure ? httpsRequest : httpRequest;
    const key = randomBytes(16).toString('base64');
    const request = requestFn({
      protocol: secure ? 'https:' : 'http:',
      hostname: parsed.hostname,
      port: parsed.port || (secure ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method: 'GET',
      headers: {
        ...headers,
        host: parsed.host,
        connection: 'Upgrade',
        upgrade: 'websocket',
        'sec-websocket-version': '13',
        'sec-websocket-key': key,
      },
    });

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      request.destroy();
      reject(new WebSocketError('timeout', `WebSocket 连接超时（${timeoutMs}ms）`));
    }, timeoutMs);
    timer.unref?.();

    request.on('upgrade', (response, socket, head) => {
      if (settled) {
        socket.destroy();
        return;
      }
      settled = true;
      clearTimeout(timer);
      const expected = acceptKey(key);
      if (response.headers['sec-websocket-accept'] !== expected) {
        socket.destroy();
        reject(new WebSocketError('bad_handshake', 'Sec-WebSocket-Accept 校验失败'));
        return;
      }
      resolve(wrapSocket({ socket, head, isClient: true }));
    });

    request.on('response', (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8').slice(0, 300);
        const error = new WebSocketError(`http_${response.statusCode}`, body || `握手失败（HTTP ${response.statusCode}）`);
        error.status = response.statusCode;
        reject(error);
      });
    });

    request.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new WebSocketError('unreachable', String(error?.message ?? error)));
    });

    request.end();
  });
}
