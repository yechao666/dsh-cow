/**
 * 主机画像：把检测到的能力翻译成一句自然语言描述。
 *
 * 设置页不再展示能力标签，而是按固定模板自动生成「这台机器能做什么」，
 * 随实例文档发给对端，用来判断任务该派给谁。
 */
import { arch, cpus, hostname, platform, release, totalmem } from 'node:os';

const OS_NAMES = { darwin: 'macOS', linux: 'Linux', win32: 'Windows', freebsd: 'FreeBSD' };
const ARCH_NAMES = { arm64: 'arm64', x64: 'x86-64', ia32: 'x86', arm: 'arm' };

const TOOL_LABELS = {
  'tool.git': 'Git',
  'tool.python3': 'Python 3',
  'tool.ffmpeg': 'FFmpeg',
  'tool.xcodebuild': 'Xcode 命令行构建',
  'tool.docker': 'Docker',
  'gpu.apple': 'Apple Silicon GPU',
  'gpu.nvidia': 'NVIDIA GPU',
};

const WORKLOAD_LABELS = {
  'tool.xcodebuild': 'iOS/macOS 构建与打包',
  'tool.docker': '容器镜像构建',
  'tool.python3': '脚本与数据处理',
  'tool.ffmpeg': '音视频转码',
  'gpu.apple': '本地模型推理与图形处理',
  'gpu.nvidia': 'CUDA 训练与推理',
  'tool.git': '代码仓库操作',
};

function memoryGb(total) {
  return Math.max(1, Math.round(Number(total ?? 0) / 1024 ** 3));
}

/**
 * @param {{ capabilities?: object[], host?: string, platform?: string, release?: string,
 *           arch?: string, cpuCount?: number, cpuModel?: string, totalMemory?: number }} input
 * @returns {string} 自然语言描述（中文）
 */
export function buildMachineDescription(input = {}) {
  const capabilities = Array.isArray(input.capabilities) ? input.capabilities : [];
  const available = new Set(capabilities.filter((item) => item && item.available !== false).map((item) => item.id));
  const plat = input.platform ?? platform();
  const osName = OS_NAMES[plat] ?? plat;
  const rel = String(input.release ?? release()).split('-')[0];
  const cpuList = cpus();
  const cpuModel = String(input.cpuModel ?? cpuList[0]?.model ?? '').trim();
  const cores = Number(input.cpuCount ?? cpuList.length ?? 0);
  const mem = memoryGb(input.totalMemory ?? totalmem());
  const host = input.host ?? hostname();
  const archName = ARCH_NAMES[input.arch ?? arch()] ?? (input.arch ?? arch());

  const tools = Object.entries(TOOL_LABELS)
    .filter(([id]) => available.has(id))
    .map(([, label]) => label);
  const workloads = Object.entries(WORKLOAD_LABELS)
    .filter(([id]) => available.has(id))
    .map(([, label]) => label);

  const segments = [
    `这是一台运行 ${osName}${rel ? ` ${rel}` : ''} 的 ${archName} 机器（${host}）`,
    `配置 ${cores} 核${cpuModel ? `（${cpuModel}）` : ''} / ${mem} GB 内存`,
    tools.length ? `已具备 ${tools.join('、')} 等工具` : '具备本机命令执行与文件读写能力',
    workloads.length
      ? `适合承担 ${workloads.slice(0, 4).join('、')} 类任务`
      : '适合承担本机命令执行、文件处理与自动化脚本类任务',
  ];
  return `${segments.join('，')}。`;
}
