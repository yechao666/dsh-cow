# dsh-cow（co-work）

多台 DSH 之间的协同工作插件：**主 DSH 开服务，子 DSH 主动连上来**，用一条
WebSocket 长连接做全双工 JSON 通讯。

- 主 DSH：监听端口、设置一个共用连接密码，向下派任务、观察结果；
- 子 DSH：填写主 DSH 地址 + 密码，主动建立并维持长连接，执行任务、回传结果；
- 每个子 DSH 同一时间只执行一个任务；工作目录由 `allowedRoots` 白名单控制；
- 子 DSH 只上报节点信息（名称、版本、说明），**不上报自己的监听端口**；
- 主 DSH 可以对**离线子节点**派任务：任务进入离线队列（默认保留 2 小时），子节点上线后自动下发；
- 子 DSH 同一时间只执行一个任务，其余任务按 FIFO 排队（默认最多 8 个）；父端会显示真实的排队状态与位置，并可直接取消；
- 任务执行中会回传流式进度（阶段/工具/助手文本）；子端 Agent 可以用 `cow_ask` 向发起方提问，主端用 `cow_answer` 回答；
- 文件交换支持单个文件、目录递归（`cow_send_file` 传目录）与目录拉取（`cow_pull_dir`），逐文件 sha256 校验；
- 连接握手后启用 **AES-256-GCM 帧级加密**（密钥由共用密码 + 每次连接的 nonce 派生，重连即轮换）；旧客户端不支持时自动回落明文；
- 任务完成会带回 cwd 下新增/修改文件的 artifacts 清单，主端自动拉取 ≤10MB 的小产物；
- `cow_doctor` 生成诊断包；设置页新增「任务队列与提问」卡片，可查看排队任务并直接回答远端问题；
- 子 DSH 执行委派任务时的**审批请求自动转给主 DSH**：主端 `cow_answer` 或设置页选择「允许一次/拒绝」，未回答或上级不可达时 fail-closed；
- 侧边栏 **「COW状态」** 面板：本机节点信息、我派出的任务、本机执行/排队任务、待人工处理的子 DSH 审批/提问，以及任务、提问/回答、文件传输、节点上下线等活动，每 4 秒刷新。

## 配置

设置 → dsh-cow：

- **节点配置**：节点名称、附加说明、工作区根目录（数据目录，默认是用户主目录下的 `dsh-cow-root`，由代码按平台解析；留空保存也回落到它）；版本/角色/端点/连接概况等只读信息统一放到侧边栏「COW状态」；
- **作为主 DSH**：监听地址/端口、连接密码（至少 12 位，可一键生成随机密钥）、已连接子节点列表（在线状态、版本、说明、当前任务、版本落后时显示「升级到 x.y.z」）、任务队列与远端提问；
- **作为子 DSH**：上级地址（`ws://host:port/cow/v1/channel` 或 `http://host:port/cow/v1`）、密码；保存后自动建立长连接并断线重连。

## 协议（cow/v1，JSON over WebSocket）

端点：`/cow/v1/channel`，密码通过 `Authorization: Bearer <password>` 在升级握手时校验。

| 帧 | 方向 | 说明 |
|---|---|---|
| `auth.challenge` | 接受方 → 拨号方 | 挑战：nonce + salt |
| `hello` / `welcome` | 双向 | instanceId、名称、版本、proof、ack 水位 |
| `task.assign` | 主 → 子 | 下发任务：taskId、prompt、cwd、workspaceName、timeoutSec |
| `task.progress` | 子 → 主 | 流式进度：seq、kind（phase/turn/tool/text）、text |
| `task.result` | 子 → 主 | 终态：succeeded / failed / canceled + 结论 |
| `task.cancel` | 主 → 子 | 取消排队或执行中的任务 |
| `task.question` / `task.answer` | 子 ↔ 主 | 远端提问与回答 |
| `file.*` | 双向 | 文件/目录分块传输、断点续传、目录清单 |
| `peer.message` | 双向 | 协作消息 |
| `ping` / `pong` | 双向 | 心跳（20s），断线自动退避重连 |

任务与文件事件封套、进度语义、离线队列与提问流程详见 [docs/protocol.md](docs/protocol.md)。

## 拓扑（一父多子，无深度概念）

- 每个节点只有**直接上级**与**直接下级**，不存在全局层级/depth；每个节点只认识自己的一级邻居。
- 子节点 hello 里上报自己的上级，父节点若发现对方正是自己的上级，会拒绝把它再当作下级接入（避免互为上下级）。
- 任务只能派给直接下级，不能派回上级；文件交换同理。
- 设置页不再显示层级/级联上限，配置里也不再有 maxDepth。

## 一键接入子节点

```sh
node scripts/join-child.mjs --home ~/.dsh-childA --name "子DSH-A" \
  --parent ws://<主DSH地址>:59999/cow/v1/channel --password <主DSH连接密码> \
  --root ~/cow-workspaces/A --launch
```

脚本会创建独立 `DSH_HOME`（web profile + 本地 dsh-cow 插件）、写入节点身份与上级地址、复制当前用户的模型凭据（`--no-credentials` 可关闭），并可选后台启动。密码策略是**每个节点各自设置**：子节点用上级的密码；中间节点的下级用中间节点自己的密码（在主 DSH 页配置）。

## 工具

- `cow_status`：本机状态、连接数、当前任务；
- `cow_peers`：节点列表（在线状态、版本、说明）；
- `cow_delegate`：派任务（peer、prompt、cwd、waitSeconds）；对端离线自动入队；
- `cow_task`：查询/等待任务（含流式进度与 `pendingQuestion`）；
- `cow_answer`：回答远端任务的提问；
- `cow_ask`：子端任务内向上级提问（阻塞等待回答，默认 300s）；
- `cow_cancel`：取消任务（排队任务立即出队）；
- `cow_retry`：重试失败/中断/过期的出站任务；
- `cow_upgrade`：把本机当前 dsh-cow 版本推给直接下级，子端 agent 用 `plugin_manager` 安装，等待重连上报新版本；
- `cow_notify`：发协作消息；
- `cow_doctor`：生成本机诊断包（版本/配置/加密状态/队列/文件统计），返回 JSON 路径；
- `cow_send_file` / `cow_receive_file`：发/取文件（单个或目录、断点续传、sha256）；
- `cow_pull_dir`：拉取远端整个目录；
- `cow_cancel_file` / `cow_set_file_policy`：取消传输 / 调整对端文件策略。

## 已知限制

- 子节点升级走子端 agent 的 `plugin_manager`：安装动作会卸载当前插件，升级任务可能中断；若子端未自动重连并上报新版本，需要重启子端进程或重新启用插件。

- 事件至少一次投递，接收方去重窗口为内存 512 条；进程重启后窗口清空。
- 通道业务帧已用 AES-256-GCM 加密；握手帧仍是明文，密码强度决定抗离线猜测能力，跨公网建议随机密钥 + 隧道。
- 远端提问只保存在内存，进程重启会丢失。
- 文件按文件顺序传输，不做带宽限制；目录很大时会占用较长时间。
- 子端队列上限、单任务时长等由子端配置决定，主端无法强制。

## 安装

```bash
dsh plugin --profile desktop add link:/path/to/dsh-cow
# 或从另一个 dsh-cow 主机的 HTTP 安装源：
dsh plugin --profile desktop add dsh-cow --registry http://<host>:<port>/cow/v1/plugin/npm/
```

## 开发

```bash
node scripts/build-client.mjs   # 打包设置页
node --test test/*.test.mjs     # 单元 + WebSocket 集成测试
```

状态文件在 `$DSH_HOME/cow/`（identity.json、peers.json、tasks/、settings.json）。
