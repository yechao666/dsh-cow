/**
 * 把 client-src/index.js 打包成宿主可加载的浏览器模块 `lib/client.js`。
 *
 * 宿主约定：客户端半侧导出到 `window.__ModuleLoader__.load({ id, factory })`，
 * 工厂返回模块导出（name/inject/apply），浏览器内核按需物化。
 *
 * 用法：pnpm run build:client
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(sourceDirectory, '..');
const outputPath = resolve(packageRoot, 'lib/client.js');

const result = await build({
  entryPoints: [resolve(packageRoot, 'client-src/index.js')],
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['chrome100'],
  external: ['react', 'react-dom'],
  write: false,
  minify: false,
  legalComments: 'none',
});
const bundled = result.outputFiles?.[0]?.text;
if (!bundled) throw new Error('esbuild did not produce a client bundle');
const wrapped = `window.__ModuleLoader__.load({
  id: "dsh-cow",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${bundled}
    return module.exports;
  }
});
`;
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, wrapped, 'utf8');
console.log(`Wrote ${outputPath}`);
