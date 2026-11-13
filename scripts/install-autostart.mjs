#!/usr/bin/env node
/**
 * macOS 开机自启：为某个子 DSH 的 DSH_HOME 生成 LaunchAgent。
 *
 *   node scripts/install-autostart.mjs --home /tmp/cow-child-a [--label cow-child-a] [--load]
 *
 * 生成 ~/Library/LaunchAgents/com.dsh-cow.<label>.plist；--load 会立即 launchctl load。
 * 非 macOS 只打印提示并退出 1。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  if (!argv[i].startsWith('--')) continue;
  const key = argv[i].slice(2);
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { args[key] = next; i += 1; } else { args[key] = true; }
}
if (process.platform !== 'darwin') {
  console.error('当前不是 macOS，请用 systemd/Windows 服务管理器按同样参数托管 dsh 进程');
  process.exit(1);
}
const home = resolve(String(args.home ?? '').replace(/^~(?=$|\/)/, homedir()));
if (!args.home) {
  console.error('需要 --home 指向子 DSH 的 DSH_HOME');
  process.exit(1);
}
const label = String(args.label ?? `child-${home.split('/').filter(Boolean).pop()}`);
const plistLabel = `com.dsh-cow.${label.replace(/[^\w.-]+/g, '-')}`;
const dir = resolve(String(args['write-dir'] ?? join(homedir(), 'Library/LaunchAgents')).replace(/^~(?=$|\/)/, homedir()));
mkdirSync(dir, { recursive: true });
const file = join(dir, `${plistLabel}.plist`);
const dsh = process.env.DSH_BIN || `${homedir()}/.local/bin/dsh`;
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${plistLabel}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${dsh}</string>
    <string>--profile</string><string>web</string>
    <string>--port</string><string>0</string>
    <string>--no-open</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict><key>DSH_HOME</key><string>${home}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${home}/autostart.log</string>
  <key>StandardErrorPath</key><string>${home}/autostart.err.log</string>
</dict>
</plist>
`;
writeFileSync(file, plist);
console.log(`已生成 ${file}`);
console.log(`启用：launchctl load -w ${file}`);
if (args.load) {
  const { execFileSync } = await import('node:child_process');
  execFileSync('launchctl', ['load', '-w', file], { stdio: 'inherit' });
  console.log('已加载到 launchd');
}
