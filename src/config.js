/**
 * 插件配置（schemastery）。
 *
 * 只有 `.volatile()` 字段会出现在「设置 → 插件 → dsh-cow」表单里；
 * 入站 token 与出站 peer 表**不**放在配置里 —— 它们是状态而不是配置，
 * 存在 `$DSH_HOME/cow/` 下（0600），避免 token 被写进 profile 补丁。
 */
import { homedir, hostname } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import z from '@deepseek-ai/schemastery';

export const SETTINGS_NAMESPACE = 'dsh-cow';

/**
 * 默认工作区根目录（数据目录）：当前用户 home 下的 dsh-cow-root。
 * 用户可在设置页覆盖；保存空值时也回落这里。
 */
export const DEFAULT_ALLOWED_ROOT = join(homedir(), 'dsh-cow-root');

/** 默认实例名：优先 macOS「计算机名」，其次系统 hostname。 */
function defaultDisplayName() {
  try {
    if (process.platform === 'darwin') {
      const name = execSync('scutil --get ComputerName', { encoding: 'utf8', timeout: 1500 }).trim();
      if (name) return name;
    }
  } catch {
    /* 忽略，退回 hostname */
  }
  return hostname();
}

export const Config = z.object({
  enabled: z.boolean().default(true).volatile().description('启用 dsh-cow'),
  displayName: z
    .string()
    .default('')
    .volatile()
    .description('本实例对外展示的名字，其它 DSH 登记后会看到（留空用主机名）'),

  // ── 入站：别的 DSH 把任务派给我 ──────────────────────────────
  serverEnabled: z.boolean().default(true).volatile().description('接受其它 DSH 派来的任务'),
  listenPort: z
    .number()
    .default(59999)
    .volatile()
    .description('自建监听端口；0 表示复用宿主 webServer 路由（推荐）'),
  listenHost: z.string().default('127.0.0.1').volatile().description('自建监听地址；跨主机时改成 0.0.0.0 或本机内网 IP'),
  allowedRoots: z
    .string()
    .default(DEFAULT_ALLOWED_ROOT)
    .volatile()
    .description('允许远端任务使用的工作目录根，换行分隔。留空自动使用用户主目录下的 dsh-cow-root（由代码按平台解析）'),
  maxConcurrentTasks: z.number().default(2).volatile().description('同时执行的远端任务上限'),
  maxQueuedTasks: z.number().default(8).volatile().description('排队上限，超出直接拒绝'),
  maxTaskMinutes: z.number().default(60).volatile().description('单个远端任务最长执行时间（分钟）'),
  maxFileMB: z.number().default(50).volatile().description('单个交换文件的上限（MB）'),
  maxConcurrentFiles: z.number().default(4).volatile().description('同时进行的文件传输上限'),
  taskRetentionHours: z.number().default(72).volatile().description('任务记录保留时长（小时）'),
  agentPreset: z
    .string()
    .default('')
    .volatile()
    .description('远端任务使用哪个 agent preset（留空用 profile 默认；不选 preset 的会话可能没有 bash 等工具）'),
  transport: z
    .string()
    .default('auto')
    .volatile()
    .description('协作传输方式：auto（有 Haos 凭证走中心转发）/ p2p（实例直连）/ haos（强制中心转发）'),
  haosBaseUrl: z.string().default('').volatile().description('Haos 中心地址，例如 http://127.0.0.1:4600'),
  haosApiKey: z.string().role('secret').default('').volatile().description('Haos 用户级 API Key（用于把本实例注册进 Haos）'),
  relayPollSeconds: z.number().default(2).volatile().description('Haos 模式下拉取待办任务的间隔（秒）'),
  allowCascade: z.boolean().default(true).volatile().description('允许把收到的任务再派给下级（关闭后本节点只执行不再委派）'),

  // ── 出站：我把任务派给别的 DSH ────────────────────────────────
  enrollString: z
    .string()
    .default('')
    .volatile()
    .description('把对端给的登记串粘贴到这里即可完成登记（cods1.…，可重复提交，幂等）'),
  channelEnabled: z.boolean().default(true).volatile().description('与已登记主机保持 WebSocket 长连接（关闭后退化为 HTTP 轮询）'),
  channelDial: z
    .string()
    .default('auto')
    .volatile()
    .description('长连接由谁拨号：auto（instanceId 小的一方拨）| always（本机总是拨）| never（只接受对方连接）'),
  notifyMode: z
    .string()
    .default('inject')
    .volatile()
    .description('远端通知怎么送给 Agent：inject（直接注入会话）| inbox（只进收件箱）| off'),
  notifyOnTaskComplete: z.boolean().default(true).volatile().description('远端任务完成/失败时通知发起方'),
  maxInjectionsPerMinute: z.number().default(3).volatile().description('同一会话每分钟最多注入多少条远端通知'),
  inboxRetentionHours: z.number().default(168).volatile().description('收件箱保留时长（小时）'),
  defaultWaitSeconds: z.number().default(120).volatile().description('cow_delegate 默认等待秒数，超时则返回 taskId'),
  capabilityRefreshMinutes: z.number().default(10).volatile().description('对端能力文档缓存时长（分钟）'),

  // ── 能力声明 ──────────────────────────────────────────────────
  autoDetect: z.boolean().default(true).volatile().description('自动探测本机能力（docker/xcodebuild/GPU 等）'),
  probes: z
    .string()
    .default('')
    .volatile()
    .description('额外探测项，每行 `id | 标题 | 标签 | 命令`，例如 `tool.brew | Homebrew | brew,macos | brew --version`'),
  capabilityNote: z
    .string()
    .default('')
    .volatile()
    .description('能力描述的附加说明；会附在自动生成的描述后面'),
  declaredCapabilities: z
    .string()
    .default('')
    .volatile()
    .description('手工声明的业务能力，每行 `id | 标题 | 标签 | 说明`，例如 `intranet.pay | 支付内网 | intranet,pay | 只能访问支付内网资源`'),

  announceToAgent: z.boolean().default(true).volatile().description('把远端主机与工具用法注入系统提示'),
});

function unwrap(value) {
  if (value && typeof value === 'object' && typeof value.get === 'function') return value.get();
  return value;
}

function raw(input, key, fallback) {
  const value = unwrap(input?.[key]);
  return value === undefined || value === null || value === '' ? fallback : value;
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * 把「装配配置 + 设置页覆盖」合成运行时配置。
 * @param {object} input
 */
export function resolveConfig(input = {}) {
  const port = Number(raw(input, 'listenPort', 59999));
  return {
    enabled: Boolean(raw(input, 'enabled', true)),
    displayName: String(raw(input, 'displayName', '')).trim() || defaultDisplayName(),
    serverEnabled: true, // 子 DSH 定义上就接受主 DSH 的任务，不可关闭
    listenPort: Number.isFinite(port) && port >= 0 ? Math.round(port) : 59999,
    listenHost: String(raw(input, 'listenHost', '127.0.0.1')).trim() || '127.0.0.1',
    allowedRoots: String(raw(input, 'allowedRoots', DEFAULT_ALLOWED_ROOT)).trim() || DEFAULT_ALLOWED_ROOT,
    maxConcurrentTasks: 1, // 每个子 DSH 同时只执行一个任务
    maxQueuedTasks: positive(raw(input, 'maxQueuedTasks', 8), 8),
    maxTaskMinutes: positive(raw(input, 'maxTaskMinutes', 60), 60),
    taskRetentionHours: positive(raw(input, 'taskRetentionHours', 72), 72),
    agentPreset: String(raw(input, 'agentPreset', '')).trim(),
    transport: ['auto', 'p2p', 'haos'].includes(String(raw(input, 'transport', 'auto')))
      ? String(raw(input, 'transport', 'auto'))
      : 'auto',
    haosBaseUrl: String(raw(input, 'haosBaseUrl', process.env.HAOS_BASE_URL || 'http://127.0.0.1:4600')).replace(/\/+$/, ''),
    haosApiKey: String(raw(input, 'haosApiKey', process.env.HAOS_API_KEY || '')),
    relayPollSeconds: positive(raw(input, 'relayPollSeconds', 2), 2),
    maxFileMB: Number.isFinite(Number(raw(input, 'maxFileMB', 50)))
      ? Math.min(1024, Math.max(1, Math.round(Number(raw(input, 'maxFileMB', 50)))))
      : 50,
    maxConcurrentFiles: Number.isFinite(Number(raw(input, 'maxConcurrentFiles', 4)))
      ? Math.min(16, Math.max(1, Math.round(Number(raw(input, 'maxConcurrentFiles', 4)))))
      : 4,
    allowCascade: true, // 是否有资格继续下派由组织拓扑（是否直接下级）决定，不做开关
    enrollString: String(raw(input, 'enrollString', '')).trim(),
    channelEnabled: true, // 长连接（含重连）是协议的一部分，不可关闭
    channelDial: ['auto', 'always', 'never'].includes(String(raw(input, 'channelDial', 'auto')))
      ? String(raw(input, 'channelDial', 'auto'))
      : 'auto',
    notifyMode: ['inject', 'inbox', 'off'].includes(String(raw(input, 'notifyMode', 'inject')))
      ? String(raw(input, 'notifyMode', 'inject'))
      : 'inject',
    notifyOnTaskComplete: Boolean(raw(input, 'notifyOnTaskComplete', true)),
    maxInjectionsPerMinute: positive(raw(input, 'maxInjectionsPerMinute', 3), 3),
    inboxRetentionHours: positive(raw(input, 'inboxRetentionHours', 168), 168),
    defaultWaitSeconds: positive(raw(input, 'defaultWaitSeconds', 120), 120),
    capabilityRefreshMinutes: positive(raw(input, 'capabilityRefreshMinutes', 10), 10),
    autoDetect: Boolean(raw(input, 'autoDetect', true)),
    probes: String(raw(input, 'probes', '')),
    capabilityNote: String(raw(input, 'capabilityNote', '')),
    declaredCapabilities: String(raw(input, 'declaredCapabilities', '')),
    announceToAgent: Boolean(raw(input, 'announceToAgent', true)),
  };
}
