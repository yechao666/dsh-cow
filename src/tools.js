import { readFileSync } from 'node:fs';
/**
 * dsh-cow 的模型侧工具（WebSocket 全双工，纯消息）。
 *
 * 目标节点一律用 `peerId`（稳定的节点标识）标识；`peerName` 是可选显示名，
 * 只作展示提示，名称可能随时变化、不参与路由与校验；工具参数里不再出现 `peer`。
 *
 *   cow_status / cow_peers / cow_send / cow_doctor + 文件交换工具
 */
import { buildEnvelope, newMessageId } from './message-core.js';

function textOutput(value) {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }];
}

function output() {
  return { schema: { type: 'object' }, render: (_args, value) => textOutput(value) };
}

export function registerTools(ctx, definitions) {
  ctx.inject(['tools'], (sctx) => {
    const tools = sctx.get('tools', false);
    if (!tools?.register) return;
    for (const definition of definitions) {
      tools.register({
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
        output: definition.output,
        timeoutMs: definition.timeoutMs,
        execute: definition.execute,
      });
    }
  });
}

function versionLess(a, b) {
  const pa = String(a ?? '').replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const pb = String(b ?? '').replace(/^v/, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
}

function installedVersion() {
  try {
    return String(JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version ?? '');
  } catch {
    return '';
  }
}

function sessionIdOf(exec) {
  return String(exec?.agent?.session?.id ?? exec?.agent?.session?.sessionId ?? '') || '';
}

const PEER_ID_PARAM = {
  type: 'string',
  description: '目标节点 peerId（稳定节点标识，cow_…）；cow_peers 返回值里叫 peerId',
};

const PEER_NAME_PARAM = {
  type: 'string',
  description: '可选：目标节点的显示名提示；名称可能随时变化，不参与路由与校验，实际以 peerId 为准',
};

export function createToolDefinitions({ instance, channel, peers, files, doctor, bridge, router, activity, packages, sessionInfoFor }) {
  const peerById = (id) => {
    const needle = String(id ?? '').trim();
    if (!needle) return null;
    return peers.list().find((item) => item.peerId === needle || item.id === needle) ?? null;
  };
  const peerByName = (name) => {
    const needle = String(name ?? '').trim();
    if (!needle) return null;
    const matches = peers.list().filter((item) => item.label === needle);
    if (matches.length > 1) throw new Error(`peerName「${needle}」对应多个节点，请改用 peerId`);
    return matches[0] ?? null;
  };
  const resolvePeer = (args) => {
    const peerId = String(args?.peerId ?? '').trim();
    const peerName = String(args?.peerName ?? '').trim();
    if (!peerId && !peerName) throw new Error('缺少 peerId（可选 peerName）');
    let peer = null;
    if (peerId) {
      // 只按稳定的 peerId 路由；peerName 可能过期/被改名，忽略它，不参与校验。
      peer = peerById(peerId);
      if (!peer) throw new Error(`未知节点 peerId=${peerId}`);
    } else {
      peer = peerByName(peerName);
      if (!peer) throw new Error(`未知节点 peerName=${peerName}，请先用 cow_peers 查 peerId`);
    }
    return peer;
  };
  const parentLabel = () => peers.list().find((peer) => peer.relation === 'parent')?.label ?? '';

  return [
    ...(files ? [
      {
        name: 'cow_send_file',
        description: '把本地文件或整个目录通过 WebSocket 发给直接下级 DSH，保存到对方 allowedRoots 内。path 为目录时递归发送，remotePath 作为目录名；也可用 paths 一次发送多个文件/目录。',
        parameters: {
          type: 'object',
          properties: {
            peerId: PEER_ID_PARAM,
            peerName: PEER_NAME_PARAM,
            path: { type: 'string', description: '本机文件或目录绝对路径' },
            paths: { type: 'array', items: { type: 'string' }, description: '可选：一次发送多个文件/目录' },
            remotePath: { type: 'string', description: '对方保存路径（相对其 allowedRoots，或绝对路径且必须在根内）' },
            transferId: { type: 'string', description: '可选：自定义传输 ID（仅单文件可用）' },
          },
          required: ['peerId'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 300_000,
        async execute(args) {
          const target = resolvePeer(args);
          const peerLabel = target.label;
          const list = Array.isArray(args?.paths) && args.paths.length
            ? args.paths.map((item) => String(item))
            : [String(args?.path ?? '')];
          if (list.length === 1) {
            const result = await files.sendPath({ peerName: peerLabel, localPath: list[0], remotePath: String(args?.remotePath ?? '') });
            return { ...result, peerId: target.peerId || '', peerName: peerLabel };
          }
          const filesDone = [];
          let totalBytes = 0;
          for (const item of list) {
            const sent = await files.sendPath({ peerName: peerLabel, localPath: item, remotePath: String(args?.remotePath ?? '') });
            filesDone.push(...sent.files);
            totalBytes += sent.totalBytes;
          }
          return { files: filesDone, totalBytes, peerId: target.peerId || '', peerName: peerLabel };
        },
      },
      {
        name: 'cow_receive_file',
        description: '从直接下级 DSH 取一个文件保存到本机。path 必须是对方 allowedRoots 内的绝对路径；localPath 可选，默认保存到当前工作目录下的同名文件。',
        parameters: {
          type: 'object',
          properties: {
            peerId: PEER_ID_PARAM,
            peerName: PEER_NAME_PARAM,
            path: { type: 'string', description: '对方机器的文件绝对路径（必须在其 allowedRoots 内）' },
            localPath: { type: 'string', description: '本机保存路径（绝对路径，可选）' },
          },
          required: ['peerId', 'path'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 120_000,
        async execute(args) {
          const target = resolvePeer(args);
          const result = await files.requestFile({ peerName: target.label, remotePath: String(args?.path ?? ''), localPath: String(args?.localPath ?? '') || undefined });
          return { ...result, peerId: target.peerId || '', peerName: target.label };
        },
      },
      {
        name: 'cow_pull_dir',
        description: '从直接下级 DSH 拉取整个目录到本机（递归、逐文件 sha256 校验）。remotePath 必须是对方 allowedRoots 内的绝对路径。',
        parameters: {
          type: 'object',
          properties: {
            peerId: PEER_ID_PARAM,
            peerName: PEER_NAME_PARAM,
            remotePath: { type: 'string', description: '对方目录绝对路径（必须在其 allowedRoots 内）' },
            localPath: { type: 'string', description: '本机保存目录（绝对路径）' },
          },
          required: ['peerId', 'remotePath', 'localPath'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 300_000,
        async execute(args) {
          const target = resolvePeer(args);
          const result = await files.pullDir({ peerName: target.label, remotePath: String(args?.remotePath ?? ''), localPath: String(args?.localPath ?? '') });
          return { ...result, peerId: target.peerId || '', peerName: target.label };
        },
      },
      {
        name: 'cow_cancel_file',
        description: '取消一个进行中的文件传输（需要 sendFile 时传入的 transferId）。',
        parameters: {
          type: 'object',
          properties: { transferId: { type: 'string', description: '传输 ID' } },
          required: ['transferId'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 15_000,
        async execute(args) {
          return files.cancel(String(args?.transferId ?? '').trim());
        },
      },
    ] : []),
    {
      name: 'cow_set_file_policy',
      description: '设置某个直接下级的文件交换策略（是否允许收发文件、单文件上限 MB）。',
      parameters: {
        type: 'object',
        properties: {
          peerId: PEER_ID_PARAM,
          peerName: PEER_NAME_PARAM,
          allowFiles: { type: 'boolean', description: '是否允许与该节点交换文件' },
          maxFileMB: { type: 'number', description: '该节点单文件上限（MB），留空恢复节点默认' },
        },
        required: ['peerId'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 15_000,
      async execute(args) {
        const target = resolvePeer(args);
        if (target.relation === 'parent') throw new Error('只能设置直接下级的文件策略');
        const updated = peers.upsert({
          ...target,
          allowFiles: typeof args?.allowFiles === 'boolean' ? args.allowFiles : target.allowFiles,
          maxFileMB: Number.isInteger(args?.maxFileMB) ? args.maxFileMB : target.maxFileMB,
        });
        return {
          peerId: updated.peer.peerId || '',
          peerName: updated.peer.label,
          allowFiles: updated.peer.allowFiles,
          maxFileMB: updated.peer.maxFileMB,
        };
      },
    },
    ...(packages ? [{
      name: 'cow_upgrade',
      description:
        '向一个直接下级发送 msg.upgrade 控制消息：主端把当前插件包暴露为短期下载地址，' +
        '消息里带下载 URL、sha256 和版本；子端插件自动下载、校验并安装，然后重连。' +
        '只发一条消息，不推送文件、不建任务、不等待安装完成。',
      parameters: {
        type: 'object',
        properties: {
          peerId: PEER_ID_PARAM,
          peerName: PEER_NAME_PARAM,
          url: { type: 'string', description: '可选：外部插件包 http(s) 下载地址；不传则使用本机当前插件包' },
          sha256: { type: 'string', description: '外部 url 必填：插件包 sha256（64 位十六进制）' },
          version: { type: 'string', description: '目标版本；不传则使用本机当前版本 / 外部包由调用方声明' },
        },
        required: ['peerId'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 30_000,
      async execute(args) {
        const target = resolvePeer(args);
        if (target.relation === 'parent') throw new Error('只能升级直接下级');
        const targetVersion = String(channel.status(target.label)?.node?.version ?? '');
        if (targetVersion && versionLess(targetVersion, '1.31.0')) {
          throw new Error(`目标版本 ${targetVersion} 不支持自动升级，请先手动升级到 1.31.0+`);
        }
        const explicitUrl = String(args?.url ?? '').trim();
        const explicitSha = String(args?.sha256 ?? '').trim().toLowerCase();
        const explicitVersion = String(args?.version ?? '').trim();
        let pack;
        if (explicitUrl) {
          if (!/^https?:\/\//i.test(explicitUrl)) throw new Error('url 必须是 http(s) 下载地址');
          if (!/^[0-9a-f]{64}$/i.test(explicitSha)) throw new Error('外部 url 必须同时提供 64 位 sha256');
          if (!explicitVersion) throw new Error('外部 url 必须同时提供 version');
          pack = { name: 'dsh-cow', version: explicitVersion, url: explicitUrl, sha256: explicitSha };
        } else {
          pack = packages.issue();
        }
        const messageId = newMessageId('upg');
        const payload = {
          messageId,
          peerId: target.peerId || '',
          peerName: target.label,
          package: { ...pack, action: 'install' },
          createdAt: new Date().toISOString(),
        };
        const sent = channel.send(target.peerId || target.label, { type: 'msg.upgrade', payload });
        if (!sent?.delivered && !sent?.queued) throw new Error('升级消息未送达，目标节点当前不在线');
        activity?.add?.({
          kind: 'message',
          text: `向 ${target.label} 发送升级消息：v${pack.version}`,
          peerName: target.label,
          from: instance.displayName || instance.peerId,
          to: target.label,
          messageId,
          status: sent.delivered ? 'sent' : 'queued',
        });
        return {
          messageId,
          peerId: target.peerId || '',
          peerName: target.label,
          version: pack.version,
          sha256: pack.sha256,
          url: pack.url,
          status: sent.delivered ? 'sent' : 'queued',
        };
      },
    }] : []),
    ...(doctor ? [
      {
        name: 'cow_doctor',
        description: '生成一份诊断包（版本、配置、通道加密状态、文件统计与近期错误），写入本地 diagnostics 目录并返回路径与摘要。',
        parameters: { type: 'object', properties: {}, additionalProperties: false },
        output: output(),
        timeoutMs: 15_000,
        async execute() {
          const { path, report } = doctor();
          return {
            path,
            generatedAt: report.generatedAt,
            instance: report.instance,
            channel: report.channel,
            files: report.files,
            activity: report.activity,
          };
        },
      },
    ] : []),
    {
      name: 'cow_status',
      description: '查看本机 dsh-cow 状态：节点信息、监听地址、连接数、待回答的询问。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: output(),
      timeoutMs: 15_000,
      async execute() {
        const conns = channel.connections?.() ?? [];
        return {
          peerId: instance.peerId,
          peerName: instance.displayName,
          version: instance.version ?? '',
          description: instance.description ?? '',
          role: instance.role ?? 'leader',
          connections: conns.length,
          connectedPeers: conns.map((item) => ({ peerId: item.peerId ?? '', peerName: item.peerName, direction: item.direction })),
          pendingAsks: router?.pending?.() ?? [],
          diagnostics: {
            runningVersion: instance.version ?? '',
            installedVersion: installedVersion(),
            peers: peers.list().map((peer) => {
              const status = channel.status(peer.label);
              return { peerId: peer.peerId || '', peerName: peer.label, relation: peer.relation, state: status.state, encrypted: status.e2e === true, lastError: status.lastError ?? null };
            }),
            files: files?.stats?.() ?? null,
          },
        };
      },
    },
    {
      name: 'cow_peers',
      description: '列出通过 WebSocket 连到本机（或本机已连接）的 DSH 节点、版本、说明与连接状态。返回值用 peerId 标识节点。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: output(),
      timeoutMs: 15_000,
      async execute() {
        return {
          peers: peers.list().map((peer) => {
            const status = channel.status(peer.label);
            return {
              peerId: peer.peerId || '',
              peerName: peer.label,
              relation: peer.relation,
              connected: status.state === 'connected',
              direction: status.direction ?? null,
              node: status.node ?? null,
              description: status.node?.description ?? peer.capabilitySummary ?? '',
              version: status.node?.version ?? '',
              encrypted: status.e2e === true,
            };
          }),
        };
      },
    },
    {
      name: 'cow_send',
      description:
        '发送 dsh-cow 消息，主 DSH 不等待、不轮询。kind=dispatch（默认）把消息派给直接下级，异步进入对方会话输入队列，对方回合结束自动把 complete 注入本会话；' +
        'kind=ask 向直接上级提问/审批并等待回答；带 replyTo 时作为对某条询问的回答（answer 会回到提出询问的子会话）。' +
        '目标节点只用 peerId（稳定 peerId）路由；peerName 是可选的显示名提示，名称可能随时变化，不参与校验。',
      parameters: {
        type: 'object',
        properties: {
          peerId: PEER_ID_PARAM,
          peerName: PEER_NAME_PARAM,
          message: { type: 'string', description: '消息正文' },
          kind: { type: 'string', enum: ['dispatch', 'ask', 'answer'], description: '消息类型，默认 dispatch' },
          replyTo: { type: 'string', description: '回答哪条询问的 questionId' },
          options: { type: 'array', items: { type: 'string' }, description: '提问的可选回答' },
          timeoutSec: { type: 'number', description: 'ask 等待回答的秒数，默认 300' },
        },
        required: ['message'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 310_000,
      async execute(args, exec) {
        const text = String(args?.message ?? '');
        if (!text.trim()) throw new Error('消息不能为空');
        const replyTo = String(args?.replyTo ?? '').trim();
        if (replyTo) {
          if (typeof router?.answer !== 'function') throw new Error('当前节点不能回答提问');
          let target = null;
          try {
            target = resolvePeer(args);
          } catch (error) {
            // 回答只依赖 replyTo；peerId/peerName 可省略。给了但不认识则提示，避免答错节点。
            if (String(args?.peerId ?? '').trim() || String(args?.peerName ?? '').trim()) throw error;
          }
          const asked = (router.pending?.() ?? []).find((item) => item.questionId === replyTo);
          const answered = router.answer(replyTo, text);
          const to = asked?.peerName || target?.label || '';
          activity?.add?.({
            kind: 'message',
            text: `回答 ${replyTo}：${text.slice(0, 80)}`,
            peerName: to,
            from: instance.displayName || instance.peerId,
            to,
            messageId: replyTo,
            status: answered?.status ?? 'sent',
          });
          return { ...answered, peerId: asked?.peerId || target?.peerId || '', peerName: asked?.peerName || target?.label || '' };
        }
        const kind = String(args?.kind ?? 'dispatch');
        if (kind === 'ask' || kind === 'approval') {
          if (typeof bridge?.ask !== 'function') throw new Error('当前节点不能发起提问');
          const result = await bridge.ask({
            sessionId: sessionIdOf(exec),
            question: text,
            options: Array.isArray(args?.options) ? args.options.map(String) : [],
            timeoutSec: Number(args?.timeoutSec) || 300,
          });
          const parentPeer = peers.list().find((peer) => peer.relation === 'parent') ?? null;
          const targetName = parentPeer?.label || parentLabel();
          activity?.add?.({
            kind: 'message',
            text: `向 ${targetName || '上级'} 询问：${text.slice(0, 80)}`,
            peerName: targetName,
            from: instance.displayName || instance.peerId,
            to: targetName,
            status: result?.ok ? 'answered' : 'failed',
          });
          if (!result?.ok) throw new Error(result?.error ?? '提问失败');
          return { ...result, peerId: parentPeer?.peerId || '', peerName: parentPeer?.label || '' };
        }
        if (kind === 'answer') throw new Error('回答提问请用 replyTo 指定询问 ID');
        const target = resolvePeer(args);
        if (target.relation === 'parent') throw new Error('不能把消息派回上级（只能派给直接下级）');
        const info = typeof sessionInfoFor === 'function'
          ? sessionInfoFor(exec?.agent?.session)
          : { session: { id: sessionIdOf(exec), title: '' }, workspace: { id: '', name: '', path: '' } };
        const envelope = buildEnvelope({
          kind: 'dispatch',
          peerId: target.peerId || '',
          peerName: target.label,
          text,
          workspace: info.workspace,
          session: info.session,
          approvalMode: 'follow',
        });
        const sent = channel.send(target.peerId || target.label, { type: 'msg.dispatch', payload: envelope });
        const shortId = target.peerId ? `（${target.peerId}）` : '';
        activity?.add?.({
          kind: 'message',
          text: `派给 ${target.label}${shortId}：${text.slice(0, 80)}`,
          peerName: target.label,
          from: instance.displayName || instance.peerId,
          to: target.label,
          messageId: envelope.messageId,
          status: sent?.delivered ? 'sent' : 'queued',
        });
        if (!sent?.delivered && !sent?.queued) throw new Error('消息未送达，目标节点当前不在线');
        return {
          messageId: envelope.messageId,
          peerId: target.peerId || '',
          peerName: target.label,
          kind: 'dispatch',
          status: sent.delivered ? 'sent' : 'queued',
        };
      },
    },
  ];
}
