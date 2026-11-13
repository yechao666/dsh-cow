import assert from 'node:assert/strict';
import test from 'node:test';
import { OPCODE, WebSocketError, acceptKey, createFrameParser, encodeFrame } from '../src/ws.js';

test('acceptKey 符合 RFC 6455 示例', () => {
  assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
});

test('文本帧往返（服务端方向，不掩码）', () => {
  const parser = createFrameParser({ expectMasked: false });
  const frames = parser.push(encodeFrame({ payload: '你好' }));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].opcode, OPCODE.TEXT);
  assert.equal(frames[0].payload.toString('utf8'), '你好');
});

test('客户端掩码帧解码', () => {
  const parser = createFrameParser({ expectMasked: true });
  const frames = parser.push(encodeFrame({ payload: 'hello', masked: true }));
  assert.equal(frames[0].payload.toString('utf8'), 'hello');
});

test('掩码方向错误会被拒绝', () => {
  const serverParser = createFrameParser({ expectMasked: true });
  assert.throws(() => serverParser.push(encodeFrame({ payload: 'x', masked: false })), WebSocketError);
  const clientParser = createFrameParser({ expectMasked: false });
  assert.throws(() => clientParser.push(encodeFrame({ payload: 'x', masked: true })), WebSocketError);
});

test('分片消息被合并', () => {
  const parser = createFrameParser({ expectMasked: false });
  const first = encodeFrame({ payload: '前半', fin: false });
  const second = encodeFrame({ payload: '后半', fin: true, opcode: OPCODE.CONT });
  assert.equal(parser.push(first).length, 0);
  const frames = parser.push(second);
  assert.equal(frames.length, 1);
  assert.equal(frames[0].payload.toString('utf8'), '前半后半');
});

test('小于一个帧头的分块不会误解析', () => {
  const parser = createFrameParser({ expectMasked: false });
  const frame = encodeFrame({ payload: 'abc' });
  assert.equal(parser.push(frame.subarray(0, 1)).length, 0);
  const frames = parser.push(frame.subarray(1));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].payload.toString('utf8'), 'abc');
});

test('16 位长度与 64 位长度头部', () => {
  const parser = createFrameParser({ expectMasked: false, maxPayload: 100_000 });
  const medium = 'x'.repeat(300);
  assert.equal(parser.push(encodeFrame({ payload: medium }))[0].payload.length, 300);
  const large = 'y'.repeat(70_000);
  assert.equal(parser.push(encodeFrame({ payload: large }))[0].payload.length, 70_000);
});

test('超过上限的帧被拒绝', () => {
  const parser = createFrameParser({ expectMasked: false, maxPayload: 1000 });
  assert.throws(() => parser.push(encodeFrame({ payload: 'z'.repeat(2000) })), WebSocketError);
});

test('控制帧 ping/pong/close 保留 opcode', () => {
  const parser = createFrameParser({ expectMasked: false });
  for (const opcode of [OPCODE.PING, OPCODE.PONG, OPCODE.CLOSE]) {
    const frames = parser.push(encodeFrame({ opcode, payload: Buffer.alloc(0) }));
    assert.equal(frames[0].opcode, opcode);
  }
});

test('控制帧分片或超长被拒绝', () => {
  const parser = createFrameParser({ expectMasked: false });
  assert.throws(() => parser.push(encodeFrame({ opcode: OPCODE.PING, fin: false })), WebSocketError);
  assert.throws(() => parser.push(encodeFrame({ opcode: OPCODE.PING, payload: 'x'.repeat(200) })), WebSocketError);
});

test('RSV 位被拒绝', () => {
  const parser = createFrameParser({ expectMasked: false });
  const frame = encodeFrame({ payload: 'x' });
  frame[0] |= 0x40;
  assert.throws(() => parser.push(frame), WebSocketError);
});
