import assert from 'node:assert/strict';
import test from 'node:test';
import { registerApprovalTakeover } from '../src/approval-takeover.js';

function setup({ parent = true, askResult = { ok: true, answer: '允许一次' } } = {}) {
  let listener = null;
  const questions = [];
  const ctx = { on(type, callback) { if (type === 'approval/request') listener = callback; return () => {}; } };
  const dispose = registerApprovalTakeover({
    ctx,
    hasParent: () => parent,
    ask: async (input) => { questions.push(input); return askResult; },
    logger: { warn() {} },
  });
  return { listener, questions, dispose };
}

const request = { agent: { session: { id: 's1' } }, toolName: 'bash', reason: '写入 /etc/hosts' };
const next = async () => 'rejected';

test('审批请求转成 ask 消息，允许一次映射为 allowed-once', async () => {
  const { listener, questions } = setup();
  const outcome = await listener(request, next);
  assert.equal(outcome, 'allowed-once');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].sessionId, 's1');
  assert.match(questions[0].question, /bash/);
  assert.match(questions[0].question, /写入 \/etc\/hosts/);
  assert.deepEqual(questions[0].options, ['允许一次', '拒绝']);
});

test('拒绝映射为 rejected；无上级交回本机', async () => {
  const denied = setup({ askResult: { ok: true, answer: '拒绝' } });
  assert.equal(await denied.listener(request, next), 'rejected');

  const noParent = setup({ parent: false });
  assert.equal(await noParent.listener(request, next), 'rejected');
  assert.equal(noParent.questions.length, 0);
});

test('上级超时或取消时 fail-closed 返回 unavailable', async () => {
  const timeout = setup({ askResult: { ok: false, error: 'timeout' } });
  assert.equal(await timeout.listener(request, next), 'unavailable');

  const controller = new AbortController();
  controller.abort();
  const cancelled = setup({ askResult: { ok: true, answer: '允许一次' } });
  assert.equal(await cancelled.listener({ ...request, signal: controller.signal }, next), 'unavailable');
});
