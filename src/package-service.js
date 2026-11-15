/**
 * 主端插件包分发：把当前插件打成 npm tgz，通过公开 HTTP 地址下载。
 *
 * 下载地址不带 token：任何能访问主端端点的机器都可以下载插件包。
 * 升级消息仍只发给直接下级；子端会校验 sha256 与包内 name/version。
 */
import { createHash } from 'node:crypto';
import { buildPluginTarball, tarballName } from './tarball.js';

export function createPackageService({ root, pkg, baseUrl, logger }) {
  const log = logger ?? console;
  let cache = null;

  function build() {
    if (cache) return cache;
    const buffer = buildPluginTarball(root, { name: pkg.name, version: pkg.version });
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    cache = {
      buffer,
      sha256,
      version: String(pkg.version),
      name: String(pkg.name),
      filename: tarballName({ name: pkg.name, version: pkg.version }),
    };
    log.info?.(`[dsh-cow] 已生成插件包 ${cache.name}@${cache.version}（${buffer.length} B）`);
    return cache;
  }

  function urlFor(base = '') {
    const resolved = base || (typeof baseUrl === 'function' ? baseUrl() : baseUrl);
    const prefix = String(resolved || '').replace(/\/+$/, '');
    if (!prefix) throw new Error('主端没有可达的 HTTP 地址，请显式传 url');
    return `${prefix}/plugin/package`;
  }

  function issue({ base = '' } = {}) {
    const item = build();
    const { buffer: _buffer, ...meta } = item;
    return { ...meta, url: urlFor(base) };
  }

  /** 公开下载：没有 token；只要请求到达主端就返回当前插件包。 */
  function download() {
    return build();
  }

  return { build, issue, download, urlFor };
}
