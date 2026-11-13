import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { createFrameParser, acceptUpgrade, connect, encodeFrame } from '../src/ws.js';

test('帧解析器对随机字节不崩溃（只抛受控 WebSocketError）', () => {
  for (let i = 0; i < 500; i += 1) {
    const parser = createFrameParser({ expectMasked: i % 2 === 0 });
    const size = 1 + Math.floor(Math.random() * 64);
    try {
      parser.push(randomBytes(size));
    } catch (error) {
      assert.equal(error.name, 'WebSocketError');
    }
  }
});

test('超长帧声明会被拒绝', () => {
  const parser = createFrameParser({ expectMasked: false });
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(1024 * 1024 * 1024), 2);
  assert.throws(() => parser.push(header), /帧长度超过|message_too_big/);
});

test('压测：500 条消息按序完整收发', async () => {
  const received = [];
  const server = createServer((req, res) => { res.writeHead(404); res.end(); });
  server.on('upgrade', (req, socket, head) => {
    const conn = acceptUpgrade(req, socket, head);
    conn.on('message', (text) => conn.send(`echo:${text}`));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const conn = await connect({ url: `ws://127.0.0.1:${port}/cow/v1/channel` });
  conn.on('message', (text) => received.push(text));
  for (let i = 0; i < 500; i += 1) conn.send(`m-${i}`);
  const deadline = Date.now() + 5000;
  while (received.length < 500 && Date.now() < deadline) await new Promise((r) => setTimeout(r, 10));
  assert.equal(received.length, 500);
  assert.equal(received[0], 'echo:m-0');
  assert.equal(received[499], 'echo:m-499');
  conn.close();
  await new Promise((r) => server.close(r));
});

test('encodeFrame：掩码与非掩码长度前缀正确', () => {
  const small = encodeFrame({ opcode: 1, payload: Buffer.from('hi'), masked: true });
  assert.equal(small[1] & 0x80, 0x80);
  const large = encodeFrame({ opcode: 1, payload: randomBytes(70_000), masked: false });
  assert.equal(large[1] & 0x7f, 127);
  assert.equal(Number(large.readBigUInt64BE(2)), 70_000);
});
