/**
 * TTL / 死信测试环境：两个真实 Channel 实例，子端先离线。
 *
 * 场景：
 *   1. 主端给离线的子端发一条 5 秒后过期的 dispatch；
 *   2. 等待 6 秒后再启动子端；
 *   3. 子端不应收到旧消息；主端发件箱清空，死信文件出现 expired；
 *   4. 再发一条未过期消息，子端应收到；
 *   5. 同一个 idempotencyKey 重发，子端只执行一次。
 *
 * 运行：node scripts/ttl-5s.mjs
 */
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Channel } from '../src/channel.js';
import { PeerRegistry } from '../src/peers.js';
import { issueToken } from '../src/tokens.js';
import { hashJoinPassword } from '../src/identity.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (step, data = '') => console.log(`[ttl-test] ${new Date().toISOString()} ${step}${data ? ` ${data}` : ''}`);
const silent = { info() {}, warn() {}, error() {}, debug() {} };

async function waitFor(predicate, { timeout = 5000, interval = 30 } = {}) {
  const start = Date.now();
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error('等待超时');
    await sleep(interval);
  }
}

const homeA = mkdtempSync(join(tmpdir(), 'cow-ttl-a-'));
const homeB = mkdtempSync(join(tmpdir(), 'cow-ttl-b-'));
const { token } = issueToken('b-host');

// A：主端，接受 b-host 连入。
const peersA = new PeerRegistry({ file: join(homeA, 'peers.json') });
peersA.upsert({ url: '', token: '', label: 'b-host', peerId: 'cods_bbbb', relation: 'child' });
const a = new Channel({
  ctx: {},
  resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'never', messageTtlMinutes: 1440 }),
  peers: peersA,
  instance: {
    peerId: 'cods_aaaa', displayName: 'TTL-Main', uuid: 'ttl-main',
    passwordSalt: 'testsalt', passwordHash: hashJoinPassword(token, 'testsalt'),
  },
  authorize: (candidate) => (candidate === token ? { label: 'b-host' } : null),
  logger: silent,
  home: homeA,
});
const server = createServer((req, res) => { res.writeHead(404); res.end(); });
server.on('upgrade', (req, socket, head) => a.handleUpgrade(req, socket, head));
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
a.start();
log('A started', `ws://127.0.0.1:${port}/cow/v1`);

const expiresAt = new Date(Date.now() + 5000).toISOString();
log('send old dispatch, TTL=5s', expiresAt);
const old = a.send('b-host', {
  type: 'msg.dispatch',
  expiresAt,
  idempotencyKey: 'old-task-1',
  payload: { text: 'old task: 这条消息已经过期，不应执行' },
});
log('old queued', JSON.stringify(old));
if (!old.queued) throw new Error('离线消息没有进入发件箱');

log('wait 6s, child stays offline');
await sleep(6000);
a.tick();
const stats = a.deadLetterStats();
log('A dead letters', JSON.stringify(stats));
const dead = a.deadLetters(10);
if (!dead.some((item) => item.reason === 'expired' && item.idempotencyKey === 'old-task-1')) {
  throw new Error('旧消息没有进入死信');
}
if ((a.outbox.get('b-host')?.entries ?? []).length !== 0) {
  throw new Error('过期消息仍在发件箱');
}
log('dead-letter file', readFileSync(join(homeA, 'cow', 'dead-letters.json'), 'utf8'));

// B：子端，6 秒后才启动。
const peersB = new PeerRegistry({ file: join(homeB, 'peers.json') });
peersB.upsert({ url: `http://127.0.0.1:${port}/cow/v1`, token, label: 'a-host', peerId: 'cods_aaaa', relation: 'parent' });
const received = [];
const b = new Channel({
  ctx: {},
  resolveConfig: () => ({ channelEnabled: true, serverEnabled: true, channelDial: 'always', messageTtlMinutes: 1440 }),
  peers: peersB,
  instance: { peerId: 'cods_bbbb', displayName: 'TTL-Child', uuid: 'ttl-child' },
  authorize: () => null,
  onEvent: (item) => { received.push(item); log('B received', item.event?.payload?.text); },
  logger: silent,
  home: homeB,
});
b.start();
await waitFor(() => a.connectedCount() === 1);
await waitFor(() => b.connectedCount() === 1);
log('B connected');
await sleep(500);
if (received.length !== 0) throw new Error('子端收到了已经过期的旧消息');
log('old message not executed', `received=${received.length}`);

const freshExpiresAt = new Date(Date.now() + 30_000).toISOString();
log('send fresh dispatch, TTL=30s', freshExpiresAt);
const fresh = a.send('b-host', {
  type: 'msg.dispatch',
  expiresAt: freshExpiresAt,
  idempotencyKey: 'fresh-task-1',
  payload: { text: 'fresh task: 这条应执行' },
});
log('fresh queued', JSON.stringify(fresh));
await waitFor(() => received.some((item) => item.event?.payload?.text === 'fresh task: 这条应执行'));
const countBefore = received.length;
const duplicate = a.send('b-host', {
  type: 'msg.dispatch',
  expiresAt: freshExpiresAt,
  idempotencyKey: 'fresh-task-1',
  payload: { text: 'fresh task: 这条应执行' },
});
log('duplicate send', JSON.stringify(duplicate));
await sleep(500);
const duplicates = received.filter((item) => item.event?.payload?.text === 'fresh task: 这条应执行').length;
log('fresh/duplicate count', `total=${received.length}, fresh=${duplicates}, before=${countBefore}`);
if (duplicates !== 1) throw new Error(`幂等失败：收到 ${duplicates} 次`);
log('PASS');

b.stop();
a.stop();
await new Promise((resolve) => server.close(resolve));
