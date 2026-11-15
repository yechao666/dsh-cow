/**
 * 文件交换：复用 dsh-cow 的 WebSocket 长连接，在直接上下级之间传文件。
 *
 * 特性：分块传输、sha256 校验、断点续传（.part + meta）、进度事件、取消、并发上限。
 * 约束：只允许直接下级；接收方写入 allowedRoots；单文件上限 maxFileMB（默认 50）。
 */
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync, writeSync, renameSync, existsSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { normalizeRoots } from './paths.js';

const CHUNK_BYTES = 256 * 1024;

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function inside(root, target) {
  return target === root || target.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

function resolveIncoming(roots, path) {
  const raw = String(path ?? '').trim();
  if (!raw) throw new Error('缺少文件路径');
  const candidates = roots.length ? roots : [process.cwd()];
  const target = isAbsolute(raw) ? resolve(raw) : resolve(candidates[0], raw);
  if (!candidates.some((root) => inside(resolve(root), target))) {
    throw new Error(`目标路径不在 allowedRoots 内：${target}`);
  }
  return target;
}

export class FileExchange {
  constructor({ instance, channel, peers, resolveConfig, logger, activity }) {
    this.instance = instance;
    this.channel = channel;
    this.peers = peers;
    this.resolveConfig = resolveConfig;
    this.logger = logger ?? {};
    this.inbound = new Map();
    this.pending = new Map();
    this.transfers = new Map();
    this.activity = activity ?? null;
    this.counters = { sent: 0, received: 0, failed: 0, canceled: 0, bytesSent: 0, bytesReceived: 0, lastError: null, lastAt: null };
  }

  #roots() {
    return normalizeRoots(String(this.resolveConfig()?.allowedRoots ?? ''));
  }

  #maxBytes(peer) {
    const mb = Number(this.resolveConfig()?.maxFileMB);
    const nodeLimit = Number.isFinite(mb) && mb > 0 ? Math.min(mb, 1024) : 50;
    const peerLimit = Number(peer?.maxFileMB);
    const size = Number.isFinite(peerLimit) && peerLimit > 0 ? Math.min(nodeLimit, peerLimit) : nodeLimit;
    return Math.floor(size * 1024 * 1024);
  }

  #blocked(peer) {
    return peer && peer.allowFiles === false;
  }

  #maxConcurrent() {
    const n = Number(this.resolveConfig()?.maxConcurrentFiles);
    return Number.isFinite(n) && n > 0 ? Math.min(16, Math.floor(n)) : 4;
  }

  #busy() {
    return this.inbound.size + this.pending.size >= this.#maxConcurrent();
  }

  #send(peer, type, payload) {
    return this.channel.send(peer, { type, payload });
  }

  #wait(transferId, extra = {}, timeoutMs = 120000) {
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(transferId);
        reject(new Error('文件传输超时'));
      }, timeoutMs);
      this.pending.set(transferId, {
        ...extra,
        resolve: (value) => { clearTimeout(timer); resolvePromise(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
    });
  }

  #markFailed(error) {
    this.counters.failed += 1;
    this.counters.lastError = String(error?.message ?? error);
    this.counters.lastAt = new Date().toISOString();
  }

  /** 把本地文件发给直接下级。 */
  async sendFile({ peerName, localPath, remotePath, transferId: requestedId = '' }) {
    const target = this.peers.get(peerName);
    if (!target) throw new Error(`未知节点：${peerName}`);
    if (target.relation === 'parent') throw new Error('不能给上级发送文件（只允许直接下级）');
    if (this.#blocked(target)) throw new Error(`对端 ${target.label} 的文件接收已被禁用`);
    if (this.#busy()) throw new Error('并发文件传输已达上限，请稍后重试');
    const source = resolve(String(localPath ?? ''));
    const stat = statSync(source);
    if (!stat.isFile()) throw new Error('不是普通文件');
    const size = stat.size;
    if (size > this.#maxBytes(target)) throw new Error(`文件超过上限 ${this.#maxBytes(target)} 字节（可调整 maxFileMB）`);
    const buffer = readFileSync(source);
    const digest = sha256(buffer);
    const transferId = requestedId || `file_${randomUUID()}`;
    const name = String(remotePath ?? basename(source)).trim() || basename(source);
    this.transfers.set(transferId, { direction: 'push', peerName: target.label, canceled: false });

    // 先登记续传回包的等待，再发送 file.put（同步测试通道里回包可能立刻到达）。
    const resumePromise = this.#wait(`${transferId}:resume`, { kind: 'resume' }, 2000).catch(() => ({ offset: 0 }));
    this.#send(target.label, 'file.put', { transferId, name, size, sha256: digest });
    let offset = 0;
    try {
      const resumed = await resumePromise;
      offset = Math.max(0, Math.min(Number(resumed.offset) || 0, size));
    } catch {
      offset = 0;
    }
    if (this.transfers.get(transferId)?.canceled) {
      this.transfers.delete(transferId);
      throw new Error('文件传输已取消');
    }
    const done = this.#wait(transferId);
    for (let at = offset; at < size; at += CHUNK_BYTES) {
      if (this.transfers.get(transferId)?.canceled) break;
      const chunk = buffer.subarray(at, Math.min(at + CHUNK_BYTES, size));
      this.#send(target.label, 'file.chunk', { transferId, seq: at / CHUNK_BYTES, data: chunk.toString('base64') });
    }
    if (this.transfers.get(transferId)?.canceled) {
      this.transfers.delete(transferId);
      throw new Error('文件传输已取消');
    }
    this.#send(target.label, 'file.done', { transferId });
    const result = await done;
    this.transfers.delete(transferId);
    this.counters.sent += 1;
    this.counters.bytesSent += size;
    this.counters.lastAt = new Date().toISOString();
    this.activity?.add({
      kind: 'file',
      text: `发送文件到 ${target.label}：${result.path}（${size} B）`,
      peerName: target.label,
      from: this.instance.displayName || this.instance.peerId,
      to: target.label,
      status: 'sent',
    });
    return { transferId, peerId: target.peerId || '', peerName: target.label, direction: 'push', remotePath: result.path, bytes: size, sha256: digest, resumedFrom: offset };
  }

  /** 递归列出一个目录下的文件；返回相对路径与大小。 */
  #collectDir(root) {
    const files = [];
    const walk = (dir, rel) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name);
        const nextRel = rel ? join(rel, entry.name) : entry.name;
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) walk(abs, nextRel);
        else if (entry.isFile()) files.push({ abs, rel: nextRel, size: statSync(abs).size });
      }
    };
    walk(root, '');
    return files.sort((a, b) => a.rel.localeCompare(b.rel));
  }

  /**
   * 发送文件或整个目录（目录按相对路径铺到对方 remotePath 下）。
   * @returns {Promise<{files: Array<{path:string,bytes:number,sha256:string}>, totalBytes:number, root?:string}>}
   */
  async sendPath({ peerName, localPath, remotePath }) {
    const source = resolve(String(localPath ?? ''));
    const stat = statSync(source);
    if (stat.isFile()) {
      const sent = await this.sendFile({ peerName, localPath: source, remotePath });
      return { files: [sent], totalBytes: sent.bytes };
    }
    if (!stat.isDirectory()) throw new Error('只支持普通文件或目录');
    const target = this.peers.get(peerName);
    if (!target) throw new Error(`未知节点：${peerName}`);
    if (target.relation === 'parent') throw new Error('不能给上级发送文件（只允许直接下级）');
    const root = String(remotePath ?? basename(source)).trim() || basename(source);
    const entries = this.#collectDir(source);
    const files = [];
    let totalBytes = 0;
    for (const entry of entries) {
      const sent = await this.sendFile({
        peerName,
        localPath: entry.abs,
        remotePath: join(root, entry.rel),
      });
      files.push(sent);
      totalBytes += sent.bytes;
    }
    return { files, totalBytes, root };
  }

  /** 向直接下级请求目录清单。 */
  requestDirList({ peerName, remotePath }) {
    const target = this.peers.get(peerName);
    if (!target) throw new Error(`未知节点：${peerName}`);
    if (target.relation === 'parent') throw new Error('不能从上级取文件（只允许直接下级）');
    const transferId = `file_${randomUUID()}`;
    const done = this.#wait(transferId, { kind: 'list' }, 30_000);
    this.#send(target.label, 'file.list', { transferId, path: String(remotePath ?? '') });
    return done.then((result) => ({ ...result, transferId }));
  }

  /** 从直接下级拉取整个目录到 localPath。 */
  async pullDir({ peerName, remotePath, localPath }) {
    const listed = await this.requestDirList({ peerName, remotePath });
    const root = resolve(String(localPath ?? '.'));
    const files = [];
    let totalBytes = 0;
    for (const entry of listed.files ?? []) {
      const remote = join(String(remotePath), entry.name);
      const local = join(root, entry.name);
      mkdirSync(dirname(local), { recursive: true });
      const got = await this.requestFile({ peerName, remotePath: remote, localPath: local });
      files.push({ path: got.localPath, bytes: got.bytes, sha256: got.sha256 });
      totalBytes += got.bytes;
    }
    return { files, totalBytes, root };
  }

  /** 从直接下级取一个文件，保存到本机。 */
  async requestFile({ peerName, remotePath, localPath }) {
    const target = this.peers.get(peerName);
    if (!target) throw new Error(`未知节点：${peerName}`);
    if (target.relation === 'parent') throw new Error('不能从上级取文件（只允许直接下级）');
    if (this.#busy()) throw new Error('并发文件传输已达上限，请稍后重试');
    const transferId = `file_${randomUUID()}`;
    const save = resolve(String(localPath ?? basename(String(remotePath ?? 'file.bin'))));
    this.transfers.set(transferId, { direction: 'pull', peerName: target.label, canceled: false });
    const done = this.#wait(transferId, { kind: 'get', savePath: save });
    this.#send(target.label, 'file.get', { transferId, path: String(remotePath ?? '') });
    const result = await done;
    this.transfers.delete(transferId);
    this.counters.received += 1;
    this.counters.bytesReceived += Number(result.bytes) || 0;
    this.counters.lastAt = new Date().toISOString();
    this.activity?.add({
      kind: 'file',
      text: `从 ${target.label} 取回：${result.path}（${result.bytes} B）`,
      peerName: target.label,
      from: target.label,
      to: this.instance.displayName || this.instance.peerId,
      status: 'received',
    });
    return { transferId, peerId: target.peerId || '', peerName: target.label, direction: 'pull', localPath: result.path, bytes: result.bytes, sha256: result.sha256 };
  }

  /** 取消进行中的传输（按 sendFile/requestFile 返回或日志里的 transferId）。 */
  cancel(transferId) {
    const transfer = this.transfers.get(String(transferId ?? ''));
    if (!transfer) throw new Error(`没有进行中的传输：${transferId}`);
    transfer.canceled = true;
    try { this.#send(transfer.peerName, 'file.cancel', { transferId }); } catch { /* 忽略 */ }
    for (const key of [transferId, `${transferId}:resume`]) {
      const waiter = this.pending.get(key);
      if (waiter) {
        this.pending.delete(key);
        waiter.reject(new Error('文件传输已取消'));
      }
    }
    this.counters.canceled += 1;
    const known = this.peers.get?.(transfer.peerName);
    return { transferId, canceled: true, peerId: known?.peerId || '', peerName: transfer.peerName };
  }

  stats() {
    return {
      ...this.counters,
      activeInbound: this.inbound.size,
      activeOutbound: this.pending.size,
      maxConcurrent: this.#maxConcurrent(),
    };
  }

  #partPaths(path) {
    return { part: `${path}.part`, meta: `${path}.part.json` };
  }

  #resumeOffset(path, sha256Digest, size) {
    const { part, meta } = this.#partPaths(path);
    try {
      const info = JSON.parse(readFileSync(meta, 'utf8'));
      const bytes = Number(info?.bytes) || 0;
      if (info?.sha256 === sha256Digest && info?.size === size && existsSync(part) && bytes > 0 && bytes < size) {
        return bytes;
      }
    } catch {
      /* 没有可续传的分片 */
    }
    return 0;
  }

  async #serveFile(from, payload, transferId) {
    try {
      const source = resolveIncoming(this.#roots(), payload?.path);
      const stat = statSync(source);
      if (!stat.isFile()) throw new Error('不是普通文件');
      const peer = this.peers.get(from);
      if (this.#blocked(peer)) throw new Error(`向 ${from} 发送文件已被禁用`);
      if (stat.size > this.#maxBytes(peer)) throw new Error('文件超过发送上限（maxFileMB）');
      if (this.#busy()) throw new Error('并发文件传输已达上限');
      const buffer = readFileSync(source);
      const digest = sha256(buffer);
      this.transfers.set(transferId, { direction: 'push', peerName: from, canceled: false });
      const resumePromise = this.#wait(`${transferId}:resume`, { kind: 'resume' }, 2000).catch(() => ({ offset: 0 }));
      this.#send(from, 'file.put', { transferId, name: source, size: buffer.length, sha256: digest });
      const resumed = await resumePromise;
      const offset = Math.max(0, Math.min(Number(resumed.offset) || 0, buffer.length));
      for (let at = offset; at < buffer.length; at += CHUNK_BYTES) {
        const chunk = buffer.subarray(at, Math.min(at + CHUNK_BYTES, buffer.length));
        this.#send(from, 'file.chunk', { transferId, seq: at / CHUNK_BYTES, data: chunk.toString('base64') });
      }
      this.#send(from, 'file.done', { transferId });
      this.transfers.delete(transferId);
      this.counters.sent += 1;
      this.counters.bytesSent += buffer.length;
      this.counters.lastAt = new Date().toISOString();
    } catch (error) {
      this.transfers.delete(transferId);
      this.#markFailed(error);
      this.logger.warn?.(`[dsh-cow] 发送文件失败：${error?.message ?? error}`);
      try { this.#send(from, 'file.error', { transferId, message: String(error?.message ?? error) }); } catch { /* 忽略 */ }
    }
  }

  /** 处理来自对端的文件相关帧。 */
  handle(from, event) {
    const payload = event?.payload ?? {};
    const transferId = String(payload?.transferId ?? '');
    try {
      switch (event?.type) {
        case 'file.put': {
          if (this.#busy()) throw new Error('并发文件传输已达上限');
          const sender = this.peers.get(from);
          if (this.#blocked(sender)) throw new Error(`来自 ${from} 的文件传输已被禁用`);
          const roots = this.#roots();
          const waiter = this.pending.get(transferId);
          const target = waiter?.kind === 'get' ? resolve(waiter.savePath) : resolveIncoming(roots, payload?.name);
          const size = Number(payload?.size) || 0;
          if (size > this.#maxBytes(sender)) throw new Error('文件超过接收上限（maxFileMB）');
          const digest = String(payload?.sha256 ?? '');
          const offset = this.#resumeOffset(target, digest, size);
          const { part, meta } = this.#partPaths(target);
          mkdirSync(dirname(target), { recursive: true });
          if (offset === 0 && existsSync(part)) unlinkSync(part);
          const fd = openSync(part, offset > 0 ? 'r+' : 'w');
          writeFileSync(meta, JSON.stringify({ sha256: digest, size, bytes: offset }));
          this.inbound.set(transferId, {
            from, path: target, partPath: part, metaPath: meta, fd, bytes: offset,
            size, sha256: digest, hash: createHash('sha256'), lastProgress: offset,
          });
          // 已有分片时把已写内容读入 hash（续传校验完整性）。
          if (offset > 0) {
            this.inbound.get(transferId).hash.update(readFileSync(part).subarray(0, offset));
          }
          this.#send(from, 'file.resume', { transferId, offset });
          break;
        }
        case 'file.resume': {
          const waiter = this.pending.get(`${transferId}:resume`);
          if (!waiter) break;
          this.pending.delete(`${transferId}:resume`);
          waiter.resolve({ offset: Number(payload?.offset) || 0 });
          break;
        }
        case 'file.chunk': {
          const state = this.inbound.get(transferId);
          if (!state) throw new Error('未知传输');
          const buf = Buffer.from(String(payload?.data ?? ''), 'base64');
          writeSync(state.fd, buf, 0, buf.length, state.bytes);
          state.hash.update(buf);
          state.bytes += buf.length;
          if (state.bytes > this.#maxBytes()) throw new Error('传输超过上限（maxFileMB）');
          if (state.bytes - state.lastProgress > Math.max(CHUNK_BYTES, state.size / 20)) {
            state.lastProgress = state.bytes;
            writeFileSync(state.metaPath, JSON.stringify({ sha256: state.sha256, size: state.size, bytes: state.bytes }));
            this.#send(state.from, 'file.progress', { transferId, bytes: state.bytes, total: state.size });
          }
          break;
        }
        case 'file.progress':
          break;
        case 'file.cancel': {
          const state = this.inbound.get(transferId);
          if (state) {
            try { closeSync(state.fd); } catch { /* 忽略 */ }
            unlinkSync(state.partPath);
            unlinkSync(state.metaPath);
            this.inbound.delete(transferId);
          }
          const waiter = this.pending.get(transferId);
          if (waiter) {
            this.pending.delete(transferId);
            waiter.reject(new Error('对端取消文件传输'));
          }
          this.transfers.delete(transferId);
          this.counters.canceled += 1;
          break;
        }
        case 'file.done': {
          const state = this.inbound.get(transferId);
          if (!state) throw new Error('未知传输');
          closeSync(state.fd);
          this.inbound.delete(transferId);
          const digest = state.hash.digest('hex');
          if (state.sha256 && digest !== state.sha256) {
            unlinkSync(state.partPath);
            unlinkSync(state.metaPath);
            throw new Error('sha256 校验失败');
          }
          renameSync(state.partPath, state.path);
          unlinkSync(state.metaPath);
          const waiter = this.pending.get(transferId);
          if (waiter?.kind === 'get') {
            this.pending.delete(transferId);
            waiter.resolve({ path: state.path, bytes: state.bytes, sha256: digest });
            this.counters.received += 1;
            this.counters.bytesReceived += state.bytes;
          } else {
            this.#send(state.from, 'file.result', { transferId, path: state.path, bytes: state.bytes, sha256: digest });
            this.counters.received += 1;
            this.counters.bytesReceived += state.bytes;
          }
          this.counters.lastAt = new Date().toISOString();
          break;
        }
        case 'file.list': {
          if (this.#blocked(this.peers.get(from))) throw new Error(`来自 ${from} 的文件请求已被禁用`);
          const source = resolveIncoming(this.#roots(), payload?.path);
          const stat = statSync(source);
          if (!stat.isDirectory()) throw new Error(`不是目录：${source}`);
          const files = this.#collectDir(source).map((entry) => ({ name: entry.rel, size: entry.size }));
          this.#send(from, 'file.list.result', { transferId, path: source, files });
          break;
        }
        case 'file.list.result': {
          const waiter = this.pending.get(transferId);
          if (!waiter) break;
          this.pending.delete(transferId);
          waiter.resolve({
            path: String(payload?.path ?? ''),
            files: Array.isArray(payload?.files) ? payload.files : [],
          });
          break;
        }
        case 'file.get': {
          if (this.#blocked(this.peers.get(from))) throw new Error(`来自 ${from} 的文件请求已被禁用`);
          void this.#serveFile(from, payload, transferId);
          break;
        }
        case 'file.result': {
          const waiter = this.pending.get(transferId);
          if (!waiter) break;
          this.pending.delete(transferId);
          waiter.resolve({ path: String(payload?.path ?? waiter.savePath ?? ''), bytes: Number(payload?.bytes) || 0, sha256: String(payload?.sha256 ?? '') });
          break;
        }
        case 'file.error': {
          const waiter = this.pending.get(transferId) ?? this.pending.get(`${transferId}:resume`);
          const error = new Error(String(payload?.message ?? '文件传输失败'));
          if (waiter) {
            this.pending.delete(transferId);
            this.pending.delete(`${transferId}:resume`);
            waiter.reject(error);
          } else {
            this.logger.warn?.(`[dsh-cow] ${from} 文件错误：${error.message}`);
          }
          this.transfers.delete(transferId);
          this.#markFailed(error);
          break;
        }
        default:
          break;
      }
    } catch (error) {
      const state = this.inbound.get(transferId);
      if (state) {
        try { closeSync(state.fd); } catch { /* 忽略 */ }
        this.inbound.delete(transferId);
      }
      this.transfers.delete(transferId);
      this.#markFailed(error);
      this.logger.warn?.(`[dsh-cow] 文件交换失败：${error?.message ?? error}`);
      try { this.#send(from, 'file.error', { transferId, message: String(error?.message ?? error) }); } catch { /* 忽略 */ }
    }
  }
}
