import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProtocolError,
  readBearerToken,
  validateCreateTask,
  validateMessage,
  validateTaskId,
} from '../src/protocol.js';

test('合法请求被规范化并带默认值', () => {
  const result = validateCreateTask({
    prompt: '跑一遍 iOS 构建',
    title: '  build  ',
    cwd: '/work/repo',
    caller: { instanceId: 'cods_x', displayName: 'macbook' },
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.title, 'build');
  assert.equal(result.value.mode, 'wait');
  assert.equal(result.value.cwd, '/work/repo');
  assert.equal(result.value.caller.displayName, 'macbook');
});

test('缺少 prompt 时报 invalid_request', () => {
  const result = validateCreateTask({});
  assert.equal(result.ok, false);
  assert.equal(result.code, 'invalid_request');
});

test('超大 prompt 报 payload_too_large', () => {
  const result = validateCreateTask({ prompt: 'x'.repeat(70 * 1024) });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'payload_too_large');
});

test('timeoutSec 非正数被拒绝', () => {
  assert.equal(validateCreateTask({ prompt: 'a', timeoutSec: -1 }).code, 'invalid_request');
  assert.equal(validateCreateTask({ prompt: 'a', timeoutSec: 'abc' }).code, 'invalid_request');
  const ok = validateCreateTask({ prompt: 'a', timeoutSec: 300 });
  assert.equal(ok.value.timeoutSec, 300);
});

test('消息校验', () => {
  assert.equal(validateMessage({ message: '继续' }).ok, true);
  assert.equal(validateMessage({}).code, 'invalid_request');
  assert.equal(validateMessage({ message: 'x'.repeat(33 * 1024) }).code, 'payload_too_large');
});

test('taskId 校验', () => {
  assert.equal(validateTaskId('task_abc123').ok, true);
  assert.equal(validateTaskId('../etc/passwd').ok, false);
  assert.equal(validateTaskId('').ok, false);
});

test('bearer token 从两种头里读取', () => {
  assert.equal(readBearerToken({ authorization: 'Bearer cods_abc' }), 'cods_abc');
  assert.equal(readBearerToken({ 'x-cow-token': 'cods_xyz' }), 'cods_xyz');
  assert.equal(readBearerToken({ authorization: 'Basic abc' }), '');
  assert.equal(readBearerToken({}), '');
});

test('ProtocolError 带出 HTTP 状态码', () => {
  assert.equal(new ProtocolError('unauthorized', 'x').status, 401);
  assert.equal(new ProtocolError('too_many_tasks', 'x').status, 429);
  assert.equal(new ProtocolError('weird', 'x').status, 500);
});
