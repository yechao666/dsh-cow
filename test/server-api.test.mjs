import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { createHandler } from '../src/server.js';

function start(api, packages) {
  const handler = createHandler({ channel: { connectedCount: () => 1 }, info: { peerId: 'cow_x', displayName: 'X', version: '1.4.0' }, api, packages });
  const server = createServer((req, res) => handler(req, res));
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

function post(port, path, body, token) {
  return fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-cow-token': token } : {}) },
    body: JSON.stringify(body),
  });
}

test('HTTP 文件接口：无令牌 401，有令牌转发到 FileExchange', async () => {
  let calls = 0;
  const { server, port } = await start({
    token: 'secret-token',
    status: async () => ({ ok: true }),
    sendFile: async (body) => { calls += 1; return { peer: body.peer, bytes: 1 }; },
    receiveFile: async (body) => ({ peer: body.peer, localPath: '/tmp/x' }),
  });
  try {
    const denied = await post(port, '/cow/v1/files/send', { peer: 'A', path: '/tmp/a' });
    assert.equal(denied.status, 401);
    const ok = await post(port, '/cow/v1/files/send', { peer: 'A', path: '/tmp/a' }, 'secret-token');
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { peer: 'A', bytes: 1 });
    assert.equal(calls, 1);
    const recv = await post(port, '/cow/v1/files/receive', { peer: 'A', path: '/tmp/a' }, 'secret-token');
    assert.equal(recv.status, 200);
    const status = await fetch(`http://127.0.0.1:${port}/cow/v1/status`, { headers: { 'x-cow-token': 'secret-token' } });
    assert.equal(status.status, 200);
    assert.deepEqual(await status.json(), { ok: true });
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test('插件包下载：公开地址无需 token 返回 tgz', async () => {
  const buffer = Buffer.from('fake-tgz');
  const { server, port } = await start({}, {
    download: () => ({
      buffer,
      filename: 'dsh-cow-1.4.0.tgz',
      name: 'dsh-cow',
      version: '1.4.0',
      sha256: 'a'.repeat(64),
    }),
  });
  try {
    const ok = await fetch(`http://127.0.0.1:${port}/cow/v1/plugin/package`);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('x-cow-package'), 'dsh-cow@1.4.0');
    assert.equal(ok.headers.get('x-cow-sha256'), 'a'.repeat(64));
    assert.equal(Buffer.from(await ok.arrayBuffer()).toString(), 'fake-tgz');
    const again = await fetch(`http://127.0.0.1:${port}/cow/v1/plugin/package`);
    assert.equal(again.status, 200);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
