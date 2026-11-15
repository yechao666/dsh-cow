import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileExchange } from '../src/files.js';

const silent = { info() {}, warn() {}, error() {}, debug() {} };

function makePair({ rootsA, rootsB }) {
  const bus = {};
  const peersOf = (label, relation, peerId) => ({ get: () => ({ label, relation, peerId }), list: () => [] });
  const exchangeA = new FileExchange({
    instance: { peerId: 'cow_a' },
    channel: { send: (peer, frame) => { exchangeB.handle(peer, frame); return { delivered: true }; } },
    peers: peersOf('子 DSH-B', 'child', 'cow_b'),
    resolveConfig: () => ({ allowedRoots: rootsA }),
    logger: silent,
  });
  const exchangeB = new FileExchange({
    instance: { peerId: 'cow_b' },
    channel: { send: (peer, frame) => { exchangeA.handle(peer, frame); return { delivered: true }; } },
    peers: peersOf('主 DSH', 'parent', 'cow_a'),
    resolveConfig: () => ({ allowedRoots: rootsB }),
    logger: silent,
  });
  bus.a = exchangeA;
  bus.b = exchangeB;
  return bus;
}

test('文件推送：主 DSH 发给子 DSH，落盘并校验 sha256', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a-'));
  const rootB = mkdtempSync(join(tmpdir(), 'cow-file-b-'));
  const { a } = makePair({ rootsA: rootA, rootsB: rootB });
  const source = join(rootA, 'hello.txt');
  writeFileSync(source, 'hello file exchange');
  const result = await a.sendFile({ peerName: '子 DSH-B', localPath: source, remotePath: 'inbox/hello.txt' });
  assert.equal(result.peerName, '子 DSH-B');
  assert.equal(result.peerId, 'cow_b');
  assert.equal(result.bytes, 19);
  assert.equal(readFileSync(join(rootB, 'inbox/hello.txt'), 'utf8'), 'hello file exchange');
});

test('文件取回：主 DSH 从子 DSH 拉文件到本机', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a2-'));
  const rootB = mkdtempSync(join(tmpdir(), 'cow-file-b2-'));
  const { a } = makePair({ rootsA: rootA, rootsB: rootB });
  const remote = join(rootB, 'report.md');
  writeFileSync(remote, '# report');
  const saved = join(rootA, 'pulled.md');
  const result = await a.requestFile({ peerName: '子 DSH-B', remotePath: remote, localPath: saved });
  assert.equal(readFileSync(saved, 'utf8'), '# report');
  assert.equal(result.direction, 'pull');
});

test('路径越界被拒绝', async () => {
  const rootB = mkdtempSync(join(tmpdir(), 'cow-file-b3-'));
  const exchange = new FileExchange({
    instance: { peerId: 'cow_b' },
    channel: { send: () => ({ delivered: true }) },
    peers: { get: () => ({ label: '主 DSH', relation: 'parent' }) },
    resolveConfig: () => ({ allowedRoots: rootB }),
    logger: silent,
  });
  exchange.handle('主 DSH', { type: 'file.put', payload: { transferId: 't1', name: '../../etc/passwd', size: 1, sha256: '' } });
  // 越界时不会建立传输；随后的 chunk 会命中「未知传输」并被忽略。
  assert.equal(exchange.inbound.size, 0);
});

test('断点续传：已有 .part + meta 时从偏移处继续，最终文件正确', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a4-'));
  const rootB = mkdtempSync(join(tmpdir(), 'cow-file-b4-'));
  const { a } = makePair({ rootsA: rootA, rootsB: rootB });
  const content = Buffer.from('0123456789abcdefghij');
  const target = join(rootB, 'inbox/resume.txt');
  mkdirSync(join(rootB, 'inbox'), { recursive: true });
  // 模拟上次传到第 8 字节就断了
  writeFileSync(`${target}.part`, content.subarray(0, 8));
  writeFileSync(`${target}.part.json`, JSON.stringify({ sha256: createHash('sha256').update(content).digest('hex'), size: content.length, bytes: 8 }));
  const source = join(rootA, 'resume.txt');
  writeFileSync(source, content);
  const result = await a.sendFile({ peerName: '子 DSH-B', localPath: source, remotePath: 'inbox/resume.txt' });
  assert.equal(result.resumedFrom, 8);
  assert.equal(readFileSync(target, 'utf8'), content.toString());
});

test('取消进行中的传输会 reject 并清理登记', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a5-'));
  const source = join(rootA, 'x.txt');
  writeFileSync(source, 'cancel me');
  const exchange = new FileExchange({
    instance: { peerId: 'cow_a' },
    channel: { send: () => ({ delivered: true }) },
    peers: { get: () => ({ label: '子 B', relation: 'child' }) },
    resolveConfig: () => ({ allowedRoots: rootA, maxConcurrentFiles: 1 }),
    logger: silent,
  });
  const pending = exchange.sendFile({ peerName: '子 B', localPath: source, remotePath: 'x.txt', transferId: 't-cancel' });
  exchange.cancel('t-cancel');
  await assert.rejects(() => pending, /取消/);
});

test('按 peer 策略禁用文件接收', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a6-'));
  const source = join(rootA, 'x.txt');
  writeFileSync(source, 'no');
  const exchange = new FileExchange({
    instance: { peerId: 'cow_a' },
    channel: { send: () => ({ delivered: true }) },
    peers: { get: () => ({ label: '子 B', relation: 'child', allowFiles: false }) },
    resolveConfig: () => ({ allowedRoots: rootA }),
    logger: silent,
  });
  await assert.rejects(() => exchange.sendFile({ peerName: '子 B', localPath: source }), /已被禁用/);
});

test('maxFileMB 限制生效', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-file-a7-'));
  const source = join(rootA, 'big.bin');
  writeFileSync(source, Buffer.alloc(2 * 1024 * 1024));
  const exchange = new FileExchange({
    instance: { peerId: 'cow_a' },
    channel: { send: () => ({ delivered: true }) },
    peers: { get: () => ({ label: '子 B', relation: 'child' }) },
    resolveConfig: () => ({ allowedRoots: rootA, maxFileMB: 1 }),
    logger: silent,
  });
  await assert.rejects(() => exchange.sendFile({ peerName: '子 B', localPath: source }), /超过上限/);
});

test('目录推送：递归发送并保持相对路径', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-dir-a-'));
  const rootB = mkdtempSync(join(tmpdir(), 'cow-dir-b-'));
  const { a } = makePair({ rootsA: rootA, rootsB: rootB });
  mkdirSync(join(rootA, 'pkg/sub'), { recursive: true });
  writeFileSync(join(rootA, 'pkg/index.html'), '<h1>hi</h1>');
  writeFileSync(join(rootA, 'pkg/sub/data.txt'), 'nested');
  const result = await a.sendPath({ peerName: '子 DSH-B', localPath: join(rootA, 'pkg'), remotePath: 'incoming/pkg' });
  assert.equal(result.files.length, 2);
  assert.equal(result.totalBytes, 11 + 6);
  assert.equal(readFileSync(join(rootB, 'incoming/pkg/index.html'), 'utf8'), '<h1>hi</h1>');
  assert.equal(readFileSync(join(rootB, 'incoming/pkg/sub/data.txt'), 'utf8'), 'nested');
});

test('目录拉取：列出远端目录并逐文件取回', async () => {
  const rootA = mkdtempSync(join(tmpdir(), 'cow-dir-a2-'));
  const rootB = mkdtempSync(join(tmpdir(), 'cow-dir-b2-'));
  const { a } = makePair({ rootsA: rootA, rootsB: rootB });
  mkdirSync(join(rootB, 'out/sub'), { recursive: true });
  writeFileSync(join(rootB, 'out/a.txt'), 'A');
  writeFileSync(join(rootB, 'out/sub/b.txt'), 'BB');
  const result = await a.pullDir({ peerName: '子 DSH-B', remotePath: join(rootB, 'out'), localPath: join(rootA, 'pulled') });
  assert.equal(result.files.length, 2);
  assert.equal(readFileSync(join(rootA, 'pulled/a.txt'), 'utf8'), 'A');
  assert.equal(readFileSync(join(rootA, 'pulled/sub/b.txt'), 'utf8'), 'BB');
});
