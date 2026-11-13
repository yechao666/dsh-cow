#!/usr/bin/env node
/**
 * dsh-cow 运维 CLI（机器可读，不依赖运行中的宿主）：
 *   cow-cli status [--home DIR] [--json]
 *   cow-cli enroll --url ws://主DSH/cow/v1/channel --password *** [--home DIR]
 *
 * 文件传输通过本机运行中的 DSH 暴露的 HTTP 接口完成（复用其 WS 长连接）：
 *   cow-cli send-file --peer 名称 --path 本地文件 [--remote 对方路径] [--url http://127.0.0.1:59999]
 *   cow-cli receive-file --peer 名称 --path 对方路径 [--local 本机路径] [--url ...]
 * 令牌从 $DSH_HOME/cow/http.token 读取；入口地址优先 $DSH_HOME/cow/http.json。
 */
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { PeerRegistry } from '../src/peers.js';
import { loadIdentity, patchIdentity } from '../src/identity.js';
import { readSettings } from '../src/settings-store.js';
import { resolveHomeDir } from '../src/store.js';

function parse(argv) {
  const [command, ...rest] = argv;
  const args = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const key = rest[i].slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) { args[key] = next; i += 1; } else { args[key] = true; }
    } else {
      args._.push(rest[i]);
    }
  }
  return { command, args };
}

const home = resolve(String(parse(process.argv.slice(2)).args.home ?? process.env.DSH_HOME ?? resolveHomeDir()).replace(/^~(?=$|\/)/, homedir()));
const logger = { info: () => {}, warn: (...a) => console.error('[warn]', ...a), error: (...a) => console.error('[error]', ...a), debug: () => {} };

function out(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function identity() {
  try {
    return loadIdentity({ home });
  } catch (error) {
    throw new Error(`读取 ${home}/cow/instance.json 失败：${error.message}`);
  }
}

const { command, args } = parse(process.argv.slice(2));

try {
  if (command === 'status') {
    const id = identity();
    let peers = [];
    try {
      peers = new PeerRegistry({ file: join(home, 'cow/peers.json') }).list().map(({ token, ...peer }) => ({ ...peer, tokenConfigured: Boolean(token) }));
    } catch { /* 忽略 */ }
    const payload = {
      home,
      instanceId: id.instanceId,
      uuid: id.uuid,
      displayName: id.displayName,
      role: id.role,
      parent: id.parent ?? null,
      parentConfigured: Boolean(id.parentUrl),
      settings: readSettings(home),
      peers,
      version: String(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version ?? ''),
    };
    if (args.json) out(payload);
    else console.log(JSON.stringify(payload, null, 2));
    process.exit(0);
  }

  if (command === 'enroll') {
    const url = String(args.url ?? '').trim();
    const password = String(args.password ?? '');
    if (!url || !password) throw new Error('enroll 需要 --url 与 --password');
    patchIdentity(home, { parentUrl: url, parentPassword: password, role: 'member' });
    const peers = new PeerRegistry({ file: join(home, 'cow/peers.json') });
    peers.upsert({ url, token: password, label: '主 DSH', relation: 'parent' });
    out({ ok: true, home, parentUrl: url });
    process.exit(0);
  }

  if (command === 'send-file' || command === 'receive-file') {
    const peer = String(args.peer ?? '').trim();
    const path = String(args.path ?? '').trim();
    if (!peer || !path) throw new Error(`${command} 需要 --peer 与 --path`);
    const tokenFile = join(home, 'cow/http.token');
    if (!existsSync(tokenFile)) throw new Error(`没有找到 ${tokenFile}，请先启动本机 DSH（cow 插件会生成管理令牌）`);
    const token = readFileSync(tokenFile, 'utf8').trim();
    let urls = [];
    try {
      urls = JSON.parse(readFileSync(join(home, 'cow/http.json'), 'utf8'))?.urls ?? [];
    } catch { /* 忽略 */ }
    if (args.url) urls = [String(args.url)];
    if (!urls.length) urls = ['http://127.0.0.1:59999'];
    const body = command === 'send-file'
      ? { peer, path, remotePath: String(args.remote ?? '') }
      : { peer, path, localPath: String(args.local ?? '') || undefined };
    let lastError = null;
    for (const base of urls) {
      try {
        const response = await fetch(`${String(base).replace(/\/+$/, '')}/cow/v1/files/${command === 'send-file' ? 'send' : 'receive'}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-cow-token': token },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(180_000),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error?.message ?? `HTTP ${response.status}`);
        out(payload);
        process.exit(0);
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`无法连接本机 DSH 的 HTTP 接口：${lastError?.message ?? '未知错误'}`);
  }

  console.error('用法：cow-cli status | enroll | send-file | receive-file');
  process.exit(2);
} catch (error) {
  console.error(String(error?.message ?? error));
  process.exit(1);
}
