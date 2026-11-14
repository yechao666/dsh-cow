import { readFileSync } from 'node:fs';
/**
 * dsh-cow 的模型侧工具（WebSocket 全双工）：
 *   cow_status / cow_peers / cow_delegate / cow_task / cow_cancel / cow_notify
 *
 * 任务通过长连接下发，结果通过长连接回传；工具只负责编排与观察。
 */

function textOutput(value) {
  return [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }];
}

function output() {
  return { schema: { type: 'object' }, render: (_args, value) => textOutput(value) };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function terminal(status) {
  return status === 'succeeded' || status === 'failed' || status === 'canceled';
}

async function waitTask(tasks, taskId, waitSeconds) {
  const deadline = Date.now() + Math.max(0, Number(waitSeconds) || 0) * 1000;
  let snapshot = tasks.get(taskId);
  if (!snapshot) return null;
  while (!terminal(snapshot.status) && Date.now() < deadline) {
    await sleep(500);
    snapshot = tasks.get(taskId);
    if (!snapshot) return null;
  }
  return tasks.snapshot(snapshot);
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

export function createToolDefinitions({ instance, channel, peers, tasks, currentInbound, files, upgrade, workspaceTitleForSession, askQuestion, askMessage, postChatQuestion, answerChatQuestion, taskIdForSession, claimTask, doctor, taskTimeoutSec = 3600 }) {
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
    ...(askQuestion ? [
      {
        name: 'cow_ask',
        description: '向直接上级 DSH 提问并等待回答；仅当本机正在执行上级委派的任务时可用。适合需要人工/上级做选择或补充信息时使用。',
        parameters: {
          type: 'object',
          properties: {
            question: { type: 'string', description: '要问上级的问题' },
            options: { type: 'array', items: { type: 'string' }, description: '可选答案列表（便于上级直接选）' },
            timeoutSec: { type: 'number', description: '等待回答的秒数，默认 300' },
          },
          required: ['question'],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 310_000,
        async execute(args) {
          if (typeof askMessage !== 'function') throw new Error('当前节点不能发起询问');
          return askMessage({
            question: String(args?.question ?? ''),
            options: Array.isArray(args?.options) ? args.options.map(String) : [],
            timeoutSec: Number(args?.timeoutSec) || 300,
          });
        },
      },
    ] : []),
    {
      name: 'cow_answer',
      description: '回答某个远端任务提出的问题（问题会出现在 cow_task 的 pendingQuestion 字段）；也可用 questionId 回答未绑定任务的询问。',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务 ID' },
          questionId: { type: 'string', description: '未绑定任务的询问 ID' },
          answer: { type: 'string', description: '回答内容' },
        },
        required: ['answer'],
        additionalProperties: false,
      },
      output: output(),
      async execute(args) {
        const questionId = String(args?.questionId ?? '');
        if (questionId) return tasks.answerQuestion(questionId, String(args?.answer ?? ''));
        return tasks.answer(String(args?.taskId ?? ''), String(args?.answer ?? ''));
      },
    },
    ...(doctor ? [
      {
        name: 'cow_doctor',
        description: '生成一份诊断包（版本、配置、通道加密状态、任务队列、文件统计、近期错误），写入本地 diagnostics 目录并返回路径与摘要。',
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
            outbound: { counts: report.outboundTasks.counts, total: report.outboundTasks.total },
            inbound: { counts: report.inboundTasks.counts, total: report.inboundTasks.total },
            files: report.files,
          };
        },
      },
    ] : []),
    {
      name: 'cow_claim',
      description: '认领主 DSH 下发的任务邀请。收到任务邀请时先用这个工具确认；不要用其他插件的任务工具处理 dsh-cow 的任务。',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务邀请里的任务 ID' },
        },
        required: ['taskId'],
        additionalProperties: false,
      },
      output: output(),
      async execute(args) {
        if (typeof claimTask !== 'function') throw new Error('当前节点不能认领任务');
        return claimTask(String(args?.taskId ?? '').trim());
      },
    },
    {
      name: 'cow_reply',
      description: '回答子 DSH 的 cow_ask 询问/审批。按 questionId 回复，消息会回到同一对话。',
      parameters: {
        type: 'object',
        properties: {
          questionId: { type: 'string', description: '询问 ID' },
          answer: { type: 'string', description: '回答内容' },
        },
        required: ['questionId', 'answer'],
        additionalProperties: false,
      },
      output: output(),
      async execute(args) {
        if (typeof answerChatQuestion !== 'function') throw new Error('当前节点不能回答询问');
        return answerChatQuestion(String(args?.questionId ?? ''), String(args?.answer ?? ''));
      },
    },
    {
      name: 'cow_status',
      description: '查看本机 dsh-cow 状态：节点信息、监听地址、连接数、当前执行的任务。',
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
          currentInboundTask: currentInbound() ?? null,
          tasks: tasks.list().slice(0, 10),
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
      description: '发送一条 dsh-cow 消息。普通消息不等待；kind=question/approval 发送提问；带 replyTo 时作为对某条提问的回复。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: '目标节点：cow_peers 里的名称' },
          message: { type: 'string', description: '消息正文' },
          kind: { type: 'string', description: '消息类型：message / question / approval / result' },
          replyTo: { type: 'string', description: '回复哪条消息的 ID' },
          options: { type: 'array', items: { type: 'string' }, description: '提问/审批的可选回答' },
        },
        required: ['peer', 'message'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 15_000,
      async execute(args, exec) {
        const target = String(args?.peer ?? '').trim();
        const peer = peers.list().find((item) => item.label === target || item.instanceId === target);
        if (!peer) throw new Error(`未知节点：${target}，先用 cow_peers 查看已连接节点`);
        const text = String(args?.message ?? '');
        if (!text.trim()) throw new Error('消息不能为空');
        const replyTo = String(args?.replyTo ?? '').trim();
        if (replyTo) {
          if (typeof answerChatQuestion !== 'function') throw new Error('当前节点不能回答提问');
          return answerChatQuestion(replyTo, text);
        }
        const kind = String(args?.kind ?? 'message');
        if (kind === 'question' || kind === 'approval') {
          if (typeof postChatQuestion !== 'function') throw new Error('当前节点不能发起提问');
          return postChatQuestion({ question: text, options: Array.isArray(args?.options) ? args.options.map(String) : [] }, sessionIdOf(exec));
        }
        const id = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        const sent = channel.send(peer.label, {
          type: 'chat.message',
          payload: { id, text, originSessionId: sessionIdOf(exec), workspaceName: typeof workspaceTitleForSession === 'function' ? workspaceTitleForSession(sessionIdOf(exec)) ?? '' : '' },
        });
        if (!sent.delivered) throw new Error('消息未送达，目标节点当前不在线');
        return { id, peer: peer.label, status: 'sent', kind };
      },
    },
    {
      name: 'cow_delegate',
      description:
        '把任务通过 WebSocket 派给直接下级。远端用一个独立会话真正执行，完成后回传结论；' +
        '对端离线时任务进入离线队列，等它上线后自动下发（默认保留 2 小时）。' +
        '写清目标、验收标准、期望产出与绝对工作目录；waitSeconds=0 表示只提交不等。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: '目标子 DSH：cow_peers 里的 peer 名称' },
          prompt: { type: 'string', description: '任务说明（必填）：目标、验收标准、期望产出、必要背景' },
          cwd: { type: 'string', description: '远端工作目录（绝对路径，必须在远端 allowedRoots 内）' },
          title: { type: 'string', description: '任务短标题' },
          timeoutSec: { type: 'number', description: '远端执行超时（秒），默认使用「默认超时」' },
          waitSeconds: { type: 'number', description: '本次最多等待秒数，0 表示只提交' },
          taskId: { type: 'string', description: '可选：幂等任务 ID（重复提交返回同一任务）' },
        },
        required: ['peer', 'prompt'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 30 * 60_000,
      async execute(args, exec) {
        const target = String(args?.peer ?? '').trim();
        const peer = peers.list().find((item) => item.label === target || item.instanceId === target);
        if (!peer) throw new Error(`未知节点：${target}，先用 cow_peers 查看已连接节点`);
        if (peer.relation === 'parent') throw new Error('不能把任务派回上级（只能派给直接下级）');
        const created = tasks.assign({
          peer: peer.label,
          prompt: String(args?.prompt ?? ''),
          cwd: String(args?.cwd ?? ''),
          title: String(args?.title ?? ''),
          timeoutSec: Number(args?.timeoutSec) || taskTimeoutSec,
          taskId: String(args?.taskId ?? '').trim(),
          originSessionId: sessionIdOf(exec),
          workspaceName: typeof workspaceTitleForSession === 'function'
            ? workspaceTitleForSession(sessionIdOf(exec)) ?? ''
            : '',
        });
        const waitSeconds = Number(args?.waitSeconds) || 0;
        if (waitSeconds <= 0) return created;
        return (await waitTask(tasks, created.taskId, waitSeconds)) ?? created;
      },
    },
    {
      name: 'cow_task',
      description: '查询（并可等待）WebSocket 任务状态；waitSeconds 内每 0.5s 检查一次。',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务 ID' },
          waitSeconds: { type: 'number', description: '最多等待秒数（默认 0）' },
        },
        required: ['taskId'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 30 * 60_000,
      async execute(args) {
        const taskId = String(args?.taskId ?? '').trim();
        const snapshot = await waitTask(tasks, taskId, Number(args?.waitSeconds) || 0);
        if (!snapshot) throw new Error(`任务不存在：${taskId}`);
        return snapshot;
      },
    },
    {
      name: 'cow_cancel',
      description: '取消一个通过 WebSocket 下发、仍在执行的任务（远端副作用不会回滚）。',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '任务 ID' },
          reason: { type: 'string', description: '取消原因' },
        },
        required: ['taskId'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 15_000,
      async execute(args) {
        return tasks.cancel(String(args?.taskId ?? ''), String(args?.reason ?? '调用方取消'));
      },
    },
    {
      name: 'cow_notify',
      description: '通过长连接给另一台 DSH 发一条协作消息（不是任务）。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: '目标节点名称' },
          message: { type: 'string', description: '消息正文' },
        },
        required: ['peer', 'message'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 15_000,
      async execute(args) {
        const peer = String(args?.peer ?? '').trim();
        const sent = channel.send(peer, { type: 'peer.message', payload: { message: String(args?.message ?? '') } });
        return { peer, delivered: Boolean(sent.delivered), queued: Boolean(sent.queued) };
      },
    },
    ...(upgrade ? [{
      name: 'cow_upgrade',
      description: '把本机当前 dsh-cow 版本推送给一个直接下级并让它用 plugin_manager 安装升级；等待子端重连并上报目标版本。',
      parameters: {
        type: 'object',
        properties: {
          peer: { type: 'string', description: '目标子 DSH（cow_peers 里的名称）' },
          targetVersion: { type: 'string', description: '目标版本，默认本机当前版本' },
        },
        required: ['peer'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 180_000,
      async execute(args) {
        return upgrade.upgradePeer(String(args?.peer ?? '').trim(), { targetVersion: String(args?.targetVersion ?? '') });
      },
    }] : []),
    {
      name: 'cow_retry',
      description: '重试一个失败/取消/重启中断的出站任务（沿用原 taskId，不换 ID）。',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: '原任务 ID' },
          timeoutSec: { type: 'number', description: '超时秒数（默认使用「默认超时」）' },
        },
        required: ['taskId'],
        additionalProperties: false,
      },
      output: output(),
      timeoutMs: 120_000,
      async execute(args) {
        return tasks.retry(String(args?.taskId ?? '').trim(), { timeoutSec: Number(args?.timeoutSec) || taskTimeoutSec });
      },
    },
  ].filter((tool) => !['cow_delegate', 'cow_task', 'cow_cancel', 'cow_claim', 'cow_answer', 'cow_retry', 'cow_ask', 'cow_reply', 'cow_notify'].includes(tool.name));
}
