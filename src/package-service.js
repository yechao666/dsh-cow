/**
 * 主端插件包分发：把当前插件打成 npm tgz，通过带一次性 token 的 HTTP 地址下载。
 *
 * 升级消息本身仍走 WebSocket；这里只负责“把包放出去”，不负责安装。
 * token 只存在内存，默认 10 分钟、最多下载 5 次；主端重启后旧 URL 失效。
 */
import { createHash, randomBytes } from 'node:crypto';
import { buildPluginTarball, tarballName } from './tarball.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_DOWNLOADS = 5;

export function createPackageService({ root, pkg, baseUrl, logger, now = () => Date.now(), ttlMs = DEFAULT_TTL_MS }) {
  const log = logger ?? console;
  let cache = null;
  const tokens = new Map();

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

  /** 生成一个短期下载地址；base 默认取主端当前 HTTP 端点（形如 http://host:port/cow/v1）。 */
  function issue({ base = '', ttl = ttlMs } = {}) {
    const item = build();
    const resolved = typeof baseUrl === 'function' ? baseUrl() : baseUrl;
    const prefix = String(resolved || base || '').replace(/\/+$/, '');
    if (!prefix) throw new Error('主端没有可达的 HTTP 地址，请显式传 url');
    const token = randomBytes(24).toString('hex');
    const expiresAt = now() + Math.max(30_000, Number(ttl) || DEFAULT_TTL_MS);
    tokens.set(token, { expiresAt, downloads: 0, item });
    for (const [key, value] of tokens) {
      if (value.expiresAt <= now()) tokens.delete(key);
    }
    return {
      name: item.name,
      version: item.version,
      sha256: item.sha256,
      filename: item.filename,
      url: `${prefix}/plugin/package?token=${token}`,
    };
  }

  /** 校验 token 并返回包；过期/未知 token 返回 null。 */
  function download(token) {
    const record = tokens.get(String(token ?? ''));
    if (!record) return null;
    if (record.expiresAt <= now()) {
      tokens.delete(String(token ?? ''));
      return null;
    }
    record.downloads += 1;
    if (record.downloads > MAX_DOWNLOADS) {
      tokens.delete(String(token ?? ''));
      return null;
    }
    return record.item;
  }

  return { build, issue, download };
}
