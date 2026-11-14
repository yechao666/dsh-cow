import assert from 'node:assert/strict';
import test from 'node:test';
import { MessageRouter } from '../src/message-router.js';

test('complete/ask 注入原会话，answer 回子端', () => {
  const injected = [];
  const sent = [];
  const router = new MessageRouter({ channel: { send: (peer, frame) => sent.push({ peer, frame }) }, inject: (...args) => injected.push(args) });
  router.handle('F', { type: 'msg.complete', payload: { session: { id: 's1' }, text: 'done' } });
  router.handle('F', { type: 'msg.ask', payload: { session: { id: 's1' }, questionId: 'q1', text: 'ok?' } });
  assert.equal(injected.length, 2);
  router.answer('q1', '允许一次');
  assert.equal(sent[0].peer, 'F');
  assert.equal(sent[0].frame.type, 'msg.answer');
});
