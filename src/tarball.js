/**
 * 极简 tar.gz 打包：把插件目录打包成 npm 安装包（package/ 前缀）。
 *
 * 为什么不用 npm pack：宿主进程需要在任意安装位置、无 npm 环境下
 * 动态提供安装包；这里用 node:zlib + 手写 tar 头，零依赖且跨平台。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative, sep } from 'node:path';

const INCLUDE = ['package.json', 'cordis.patch.yml', 'README.md', 'DESIGN.md', 'bin', 'src', 'lib', 'client-src', 'docs', 'scripts'];
const SKIP = new Set(['node_modules', 'dist', '.git', 'test']);

function walk(root, dir, out) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(root, full, out);
    else if (stat.isFile()) out.push({ path: relative(root, full).split(sep).join('/'), stat });
  }
}

function octal(value, length) {
  return value.toString(8).padStart(length - 1, '0') + '\0';
}

function header(name, size, mtime) {
  const buf = Buffer.alloc(512, 0);
  const write = (str, offset, length) => buf.write(str.slice(0, length), offset, 'utf8');
  write(name, 0, 100);
  write(octal(0o644, 8), 100, 8);
  write(octal(0, 8), 108, 8);
  write(octal(0, 8), 116, 8);
  write(octal(size, 12), 124, 12);
  write(octal(mtime, 12), 136, 12);
  buf.fill(0x20, 148, 156); // checksum 先用空格占位
  write('0', 156, 1);
  write('ustar\0', 257, 6);
  write('00', 263, 2);
  let sum = 0;
  for (const byte of buf) sum += byte;
  write(octal(sum, 8), 148, 8);
  return buf;
}

function pad(buffer) {
  const rest = buffer.length % 512;
  return rest === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - rest, 0);
}

export function buildPluginTarball(root, { name, version }) {
  const entries = [];
  for (const item of INCLUDE) {
    try {
      const full = join(root, item);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(root, full, entries);
      else if (stat.isFile()) entries.push({ path: item, stat });
    } catch {
      /* 可选文件缺失时跳过 */
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));
  const chunks = [];
  for (const entry of entries) {
    const content = readFileSync(join(root, entry.path));
    chunks.push(header(`package/${entry.path}`, content.length, Math.floor(entry.stat.mtimeMs / 1000)));
    chunks.push(content);
    chunks.push(pad(content));
  }
  chunks.push(Buffer.alloc(1024, 0)); // 结束块
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}

export function tarballName({ name, version }) {
  return `${name}-${version}.tgz`;
}
