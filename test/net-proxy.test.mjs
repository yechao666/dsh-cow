import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import net from 'node:net';
import { NetGateway } from '../src/net-gateway.js';
import { LocalProxy } from '../src/local-proxy.js';
import { openProxyTunnel } from '../src/net-tunnel.js';
import { assertTargetShape, hostMatches, isPrivateAddress } from '../src/net-policy.js';
import { hashJoinPassword } from '../src/identity.js';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address().port);
    });
  });
}

function readOnce(socket) {
  return new Promise((resolve, reject) => {
    let data = '';
    const onData = (chunk) => { data += chunk.toString('utf8'); };
    socket.on('data', onData);
    socket.once('error', reject);
    setTimeout(() => {
      socket.off('data', onData);
      resolve(data);
    }, 400).unref?.();
  });
}

test('代理策略默认拒绝私网，允许公网白名单', () => {
  assert.equal(isPrivateAddress('127.0.0.1'), true);
  assert.equal(isPrivateAddress('10.1.2.3'), true);
  assert.equal(isPrivateAddress('8.8.8.8'), false);
  assert.equal(hostMatches('api.example.com', ['*.example.com']), true);
  assert.throws(() => assertTargetShape({ host: '127.0.0.1', port: 80 }), /私网/);
  assert.deepEqual(assertTargetShape({ host: 'example.com', port: 443 }), { host: 'example.com', port: 443 });
  assert.throws(() => assertTargetShape({ host: 'example.com', port: 22 }), /端口/);
});

test('加密代理隧道 + 本地 HTTP 代理转发', async () => {
  const target = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(`hello ${req.url}`);
  });
  const targetPort = await listen(target);

  const password = 'proxy-smoke-password';
  const instance = {
    peerId: 'cow_main',
    passwordSalt: 'salt',
    passwordHash: hashJoinPassword(password, 'salt'),
  };
  const peers = { list: () => [{ peerId: 'cow_child', relation: 'child' }] };
  const gateway = new NetGateway({
    instance,
    peers,
    resolveConfig: () => ({
      proxyEnabled: true,
      proxyAllowPrivate: true,
      proxyAllowHosts: '127.0.0.1',
      proxyAllowedPorts: [targetPort],
    }),
    logger: { warn() {}, info() {} },
  });
  const main = http.createServer();
  main.on('upgrade', (req, socket, head) => gateway.handleUpgrade(req, socket, head));
  const mainPort = await listen(main);

  const tunnel = await openProxyTunnel({
    parentUrl: `ws://127.0.0.1:${mainPort}/cow/v1/channel`,
    password,
    peerId: 'cow_child',
    host: '127.0.0.1',
    port: targetPort,
  });
  let raw = '';
  tunnel.on('data', (chunk) => { raw += chunk.toString('utf8'); });
  tunnel.write(`GET /tunnel HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\nconnection: close\r\n\r\n`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  assert.match(raw, /hello \/tunnel/);

  const local = new LocalProxy({
    getParent: () => ({ url: `ws://127.0.0.1:${mainPort}/cow/v1/channel`, password, peerId: 'cow_child' }),
    logger: { info() {}, warn() {} },
  });
  const localPort = await local.start();
  const response = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port: localPort, method: 'GET', path: `http://127.0.0.1:${targetPort}/http`, headers: { host: `127.0.0.1:${targetPort}` } },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk.toString('utf8'); });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(response.status, 200);
  assert.match(response.body, /hello \/http/);

  // CONNECT 也应该能透过本地代理建立隧道。
  const socket = net.connect(localPort, '127.0.0.1');
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  socket.write(`CONNECT 127.0.0.1:${targetPort} HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\n\r\n`);
  await new Promise((resolve) => setTimeout(resolve, 200));
  socket.write(`GET /connect HTTP/1.1\r\nHost: 127.0.0.1:${targetPort}\r\nconnection: close\r\n\r\n`);
  const connectRaw = await readOnce(socket);
  assert.match(connectRaw, /hello \/connect/);

  socket.destroy();
  tunnel.destroy();
  await local.stop();
  gateway.dispose();
  await new Promise((resolve) => main.close(resolve));
  await new Promise((resolve) => target.close(resolve));
});
