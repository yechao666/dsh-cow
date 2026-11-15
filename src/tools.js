import { readFileSync } from 'node:fs';
/**
 * dsh-cow 的模型侧工具（WebSocket 全双工，纯消息）。
 *
 *   cow_status / cow_peers / cow_send / cow_doctor + 文件交换工具
 *
 * 消息机制：cow_send 派 dispatch（主→子）、ask（子→主）、answer（replyTo）；
 * 子端回合结束由插件自动回 complete，主端自动注入原会话。没有任务队列，
 * 也不暴露任务查询/取消/认领工具。
 */
import { buildEnvelope } from './message-core.js';

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

export function createToolDefinitions({ instance, channel, peers, files, doctor, bridge, router, activity, sessionInfoFor }) {
  const findPeer = (target) => peers.list().find((item) => item.label === target || item.instanceId === target) ?? null;

  return [
    ...(files ? [
      {
        name: 'cow_send_file',
        description: '把本地文件或整个目录通过 WebSocket 发给直接下级 DSH，保存到对方 allowedRoots 内。path 为目录时递归发送，remotePath 作为目录名；也可用 paths 一次发送多个文件/目录。',
        parameters: {
          type: 'object',
          properties: {
            peer: { type: 'string', description: '目标子 DSH（cow_peers 里的名称）' },
            path: { type: 'string', description: '本机文件或目录绝对路径' },
            paths: { type: 'array', items: { type: 'string' }, description: '可选：一次发送多个文件/目录' },
            remotePath: { type: 'string', description: '对方保存路径（相对其 allowedRoots，或绝对路径且必须在根内）' },
            transferId: { type: 'string', description: '可选：自定义传输 ID（仅单文件可用）' },
          },
          required: ['peer'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 300_000,
        async execute(args) {
          const peer = String(args?.peer ?? '').trim();
          const list = Array.isArray(args?.paths) && args.paths.length
            ? args.paths.map((item) => String(item))
            : [String(args?.path ?? '')];
          if (list.length === 1) {
            return files.sendPath({ peer, localPath: list[0], remotePath: String(args?.remotePath ?? '') });
          }
          const filesDone = [];
          let totalBytes = 0;
          for (const item of list) {
            const sent = await files.sendPath({ peer, localPath: item, remotePath: String(args?.remotePath ?? '') });
            filesDone.push(...sent.files);
            totalBytes += sent.totalBytes;
          }
          return { files: filesDone, totalBytes };
        },
      },
      {
        name: 'cow_receive_file',
        description: '从直接下级 DSH 取一个文件保存到本机。path 必须是对方 allowedRoots 内的绝对路径；localPath 可选，默认保存到当前工作目录下的同名文件。',
        parameters: {
          type: 'object',
          properties: {
            peer: { type: 'string', description: '来源子 DSH（cow_peers 里的名称）' },
            path: { type: 'string', description: '对方机器的文件绝对路径（必须在其 allowedRoots 内）' },
            localPath: { type: 'string', description: '本机保存路径（绝对路径，可选）' },
          },
          required: ['peer', 'path'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 120_000,
        async execute(args) {
          return files.requestFile({ peer: String(args?.peer ?? '').trim(), remotePath: String(args?.path ?? ''), localPath: String(args?.localPath ?? '') || undefined });
        },
      },
      {
        name: 'cow_pull_dir',
        description: '从直接下级 DSH 拉取整个目录到本机（递归、逐文件 sha256 校验）。remotePath 必须是对方 allowedRoots 内的绝对路径。',
        parameters: {
          type: 'object',
          properties: {
            peer: { type: 'string', description: '来源子 DSH（cow_peers 里的名称）' },
            remotePath: { type: 'string', description: '对方目录绝对路径（必须在其 allowedRoots 内）' },
            localPath: { type: 'string', description: '本机保存目录（绝对路径）' },
          },
          required: ['peer', 'remotePath', 'localPath'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 300_000,
        async execute(args) {
          return files.pullDir({ peer: String(args?.peer ?? '').trim(), remotePath: String(args?.remotePath ?? ''), localPath: String(args?.localPath ?? '') });
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
          peer: { type: 'string', description: '直接下级名称' },
          allowFiles: { type: 'boolean', description: '是否允许与该节点交换文件' },
          maxFileMB: { type: 'number', description: '该节点单文件上限（MB），留空恢复节点默认' },
        },
        required: ['peer'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 15_000,
      async execute(args) {
        const peer = peers.get(String(args?.peer ?? '').trim());
        if (!peer) throw new Error(`未知节点：${args?.peer}`);
        if (peer.relation === 'parent') throw new Error('只能设置直接下级的文件策略');
        const updated = peers.upsert({
          ...peer,
          allowFiles: typeof args?.allowFiles === 'boolean' ? args.allowFiles : peer.allowFiles,
          maxFileMB: Number.isInteger(args?.maxFileMB) ? args.maxFileMB : peer.maxFileMB,
        });
        return { peer: updated.peer.label, allowFiles: updated.peer.allowFiles, maxFileMB: updated.peer.maxFileMB };
      },
    },
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
          instanceId: instance.instanceId,
          displayName: instance.displayName,
          version: instance.version ?? '',
          description: instance.description ?? '',
          role: instance.role ?? 'leader',
          connections: conns.length,
          connectedPeers: conns.map((item) => ({ peer: item.peer, displayName: item.displayName, direction: item.direction })),
          pendingAsks: router?.pending?.() ?? [],
          diagnostics: {
            runningVersion: instance.version ?? '',
            installedVersion: installedVersion(),
            peers: peers.list().map((peer) => {
              const status = channel.status(peer.label);
              return { label: peer.label, relation: peer.relation, state: status.state, encrypted: status.e2e === true, lastError: status.lastError ?? null };
            }),
            files: files?.stats?.() ?? null,
          },
        };
      },
    },
    {
      name: 'cow_peers',
      description: '列出通过 WebSocket 连到本机（或本机已连接）的 DSH 节点、版本、说明与连接状态。',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      output: output(),
      timeoutMs: 15_000,
      async execute() {
        return {
          peers: peers.list().map((peer) => {
            const status = channel.status(peer.label);
            return {
              peer: peer.label,
              instanceId: peer.instanceId,
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
        'kind=ask 向直接上级提问/审批并等待回答；带 replyTo 时作为对某条询问的回答（answer 会回到提出询问的子会话）。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: '目标节点：cow_peers 里的名称；回答时填提问的来源节点' },
          message: { type: 'string', description: '消息正文' },
          kind: { type: 'string', enum: ['dispatch', 'ask', 'answer'], description: '消息类型，默认 dispatch' },
          replyTo: { type: 'string', description: '回答哪条询问的 questionId' },
          options: { type: 'array', items: { type: 'string' }, description: '提问的可选回答' },
          timeoutSec: { type: 'number', description: 'ask 等待回答的秒数，默认 300' },
        },
        required: ['peer', 'message'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 310_000,
      async execute(args, exec) {
        const target = String(args?.peer ?? '').trim();
        const text = String(args?.message ?? '');
        if (!text.trim()) throw new Error('消息不能为空');
        const replyTo = String(args?.replyTo ?? '').trim();
        if (replyTo) {
          if (typeof router?.answer !== 'function') throw new Error('当前节点不能回答提问');
          const answered = router.answer(replyTo, text);
          activity?.add?.({ kind: 'message', text: `回答 ${replyTo}：${text.slice(0, 80)}`, peer: target, messageId: replyTo, status: answered?.status ?? 'sent' });
          return answered;
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
          activity?.add?.({ kind: 'message', text: `向 ${target} 询问：${text.slice(0, 80)}`, peer: target, status: result?.ok ? 'answered' : 'failed' });
          if (!result?.ok) throw new Error(result?.error ?? '提问失败');
          return result;
        }
        if (kind === 'answer') throw new Error('回答提问请用 replyTo 指定询问 ID');
        const peer = findPeer(target);
        if (!peer) throw new Error(`未知节点：${target}，先用 cow_peers 查看已连接节点`);
        if (peer.relation === 'parent') throw new Error('不能把消息派回上级（只能派给直接下级）');
        const info = typeof sessionInfoFor === 'function'
          ? sessionInfoFor(exec?.agent?.session)
          : { session: { id: sessionIdOf(exec), title: '' }, workspace: { id: '', name: '', path: '' } };
        const envelope = buildEnvelope({
          kind: 'dispatch',
          peer: peer.label,
          text,
          workspace: info.workspace,
          session: info.session,
          approvalMode: 'follow',
        });
        const sent = channel.send(peer.label, { type: 'msg.dispatch', payload: envelope });
        activity?.add?.({ kind: 'message', text: `派给 ${peer.label}：${text.slice(0, 80)}`, peer: peer.label, messageId: envelope.messageId, status: sent?.delivered ? 'sent' : 'queued' });
        if (!sent?.delivered && !sent?.queued) throw new Error('消息未送达，目标节点当前不在线');
        return { messageId: envelope.messageId, peer: peer.label, kind: 'dispatch', status: sent.delivered ? 'sent' : 'queued' };
      },
    },
  ];
}
