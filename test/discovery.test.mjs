import assert from 'node:assert/strict';
import test from 'node:test';
import { createSocket } from 'node:dgram';
import { DiscoveryResponder, broadcastTargets } from '../src/discovery.js';

test('UDP 发现：主端只回 OFFER，不携带密码', async () => {
  const responder = new DiscoveryResponder({
    instance: { peerId: 'cow_main', displayName: 'COW Dev', version: '1.32.3', passwordHash: 'hash' },
    resolveConfig: () => ({ discoveryEnabled: true }),
    endpointFor: () => 'ws://192.168.1.10:60001/cow/v1/channel',
    logger: { info() {}, warn() {} },
  });
  const status = await responder.start(0);
  assert.equal(status.running, true);
  assert.ok(status.port > 0);
  assert.ok(broadcastTargets().includes('255.255.255.255'));

  const client = createSocket({ type: 'udp4' });
  await new Promise((resolve, reject) => {
    client.once('error', reject);
    client.bind(0, '127.0.0.1', () => { client.off('error', reject); resolve(); });
  });
  const offer = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('discovery timeout')), 2000);
    client.once('message', (message) => {
      clearTimeout(timer);
      resolve(JSON.parse(message.toString('utf8')));
    });
    const nonce = '1234567890abcdef';
    client.send(JSON.stringify({ v: 1, type: 'cow.discover', nonce, peerId: 'cow_child' }), status.port, '127.0.0.1');
  });
  assert.equal(offer.type, 'cow.offer');
  assert.equal(offer.nonce, '1234567890abcdef');
  assert.equal(offer.peerId, 'cow_main');
  assert.equal(offer.endpoint, 'ws://192.168.1.10:60001/cow/v1/channel');
  assert.equal(offer.passwordRequired, true);
  assert.equal('password' in offer, false);
  client.close();
  await responder.stop();
});
