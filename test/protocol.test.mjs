import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ERROR_STATUS,
  LIMITS,
  PROTOCOL_VERSION,
  ProtocolError,
  ROUTE_PREFIX,
  errorBody,
  readBearerToken,
} from '../src/protocol.js';

test('协议常量是纯消息架构', () => {
  assert.equal(PROTOCOL_VERSION, 'cow/v1');
  assert.equal(ROUTE_PREFIX, '/cow/v1');
  assert.ok(LIMITS.messageBytes >= 32 * 1024);
});

test('bearer token 从两种头里读取', () => {
  assert.equal(readBearerToken({ authorization: 'Bearer cods_abc' }), 'cods_abc');
  assert.equal(readBearerToken({ 'x-cow-token': 'cods_xyz' }), 'cods_xyz');
  assert.equal(readBearerToken({ authorization: 'Basic abc' }), '');
  assert.equal(readBearerToken({}), '');
});

test('ProtocolError 带出 HTTP 状态码', () => {
  assert.equal(new ProtocolError('unauthorized', 'x').status, 401);
  assert.equal(new ProtocolError('unavailable', 'x').status, 503);
  assert.equal(new ProtocolError('weird', 'x').status, 500);
  assert.equal(ERROR_STATUS.invalid_request, 400);
  assert.deepEqual(errorBody('x', 'y'), { error: { code: 'x', message: 'y', details: null } });
});
