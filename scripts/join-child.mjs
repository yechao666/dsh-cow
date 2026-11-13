#!/usr/bin/env node
/**
 * 一键把本机配置成一个子 DSH 并连到上级。
 *
 * 用法：
 *   node scripts/join-child.mjs --home ~/.dsh-childA --name "子DSH-A" \
 *     --parent ws://192.168.1.10:59999/cow/v1/channel --password 你的密码 \
 *     --root ~/cow-workspaces/A [--launch] [--max-file-mb 50]
 *
 * 它会准备独立的 DSH_HOME：web profile + 本地 dsh-cow 插件 + 身份 + 上级地址，
 * 默认还会复制当前用户的模型凭据（--no-credentials 可关闭）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, cpSync, symlinkSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';

const pluginDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { args[key] = next; i += 1; } else { args[key] = true; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.home || !args.parent || !args.password) {
  console.error('必须提供 --home、--parent、--password');
  process.exit(1);
}
const home = resolve(String(args.home).replace(/^~(?=$|\/)/, homedir()));
const parent = String(args.parent);
const password = String(args.password);
const name = String(args.name ?? '子 DSH');
const root = resolve(String(args.root ?? join(homedir(), 'cow-workspaces', name.replace(/[^\w.-]+/g, '-') )).replace(/^~(?=$|\/)/, homedir()));
mkdirSync(root, { recursive: true });

// 1) profile：独立 web profile + 本地 dsh-cow 插件
const profile = join(home, 'profiles', 'web');
mkdirSync(profile, { recursive: true });
const pkgPath = join(profile, 'package.json');
const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {
  name: 'dsh-profile-web', private: true, dependencies: {}, dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
};
pkg.dependencies = pkg.dependencies ?? {};
pkg.dependencies['dsh-cow'] = `link:${pluginDir}`;
pkg.dsh = pkg.dsh ?? { profile: { bundles: [] } };
pkg.dsh.profile = pkg.dsh.profile ?? { bundles: [] };
pkg.dsh.profile.bundles = pkg.dsh.profile.bundles ?? [];
if (!pkg.dsh.profile.bundles.includes('dsh-cow')) pkg.dsh.profile.bundles.push('dsh-cow');
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
if (!existsSync(join(profile, 'cordis.patch.yml'))) writeFileSync(join(profile, 'cordis.patch.yml'), '# dsh-cow 子节点 profile\n[]\n');
if (!existsSync(join(profile, 'pnpm-workspace.yaml'))) writeFileSync(join(profile, 'pnpm-workspace.yaml'), 'packages:\n  - .\n');
const modules = join(profile, 'node_modules');
mkdirSync(modules, { recursive: true });
const link = join(modules, 'dsh-cow');
if (existsSync(link)) rmSync(link, { recursive: true, force: true });
symlinkSync(pluginDir, link, 'dir');

// 2) 身份与设置
const cowDir = join(home, 'cow');
mkdirSync(cowDir, { recursive: true });
const settingsPath = join(cowDir, 'settings.json');
const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : { schema: 1, settings: {} };
settings.settings = settings.settings ?? {};
Object.assign(settings.settings, {
  displayName: name,
  allowedRoots: root,
  listenPort: 0,
  listenHost: '127.0.0.1',
  maxFileMB: Number(args['max-file-mb']) || settings.settings.maxFileMB || 50,
});
writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);

const instancePath = join(cowDir, 'instance.json');
const instance = existsSync(instancePath) ? JSON.parse(readFileSync(instancePath, 'utf8')) : {
  schema: 1,
  instanceId: `cow_${randomBytes(8).toString('hex')}`,
  uuid: randomUUID(),
  displayName: '',
  role: 'member',
  createdAt: new Date().toISOString(),
};
instance.parent = { url: parent, label: '主 DSH' };
instance.parentUrl = parent;
instance.parentPassword = password;
writeFileSync(instancePath, `${JSON.stringify(instance, null, 2)}\n`);

// 3) 模型凭据（默认从当前 DSH_HOME 复制，避免子节点没有 provider）
if (!args['no-credentials']) {
  const source = process.env.DSH_HOME || join(homedir(), '.dsh');
  for (const item of ['.credentials.yaml', 'llm-deepseek']) {
    const from = join(source, item);
    const to = join(home, item);
    if (!existsSync(from)) continue;
    if (existsSync(to)) continue;
    try {
      if (item.endsWith('.yaml')) copyFileSync(from, to);
      else cpSync(from, to, { recursive: true });
    } catch (error) {
      console.warn(`复制 ${item} 失败（可手动复制）：${error.message}`);
    }
  }
}

const launch = `DSH_HOME=${home} dsh --profile web --port 0 --no-open`;
console.log(`已准备子 DSH：${name}`);
console.log(`  home     ${home}`);
console.log(`  上级     ${parent}`);
console.log(`  工作目录 ${root}`);
console.log(`  启动     ${launch}`);
if (args.launch) {
  const child = spawn('dsh', ['--profile', 'web', '--port', '0', '--no-open'], {
    env: { ...process.env, DSH_HOME: home },
    cwd: root,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log(`已后台启动（pid ${child.pid}），看设置页或运行 cow_peers 确认上线。`);
}
