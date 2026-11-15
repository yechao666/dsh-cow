# dsh-cow（co-work）

多台 DSH 之间的协同工作插件：**主 DSH 开服务，子 DSH 主动连上来**，用一条
WebSocket 长连接做全双工 JSON 通讯。**只有消息，没有任务层**。

- 主 DSH：监听端口、设置一个共用连接密码，用 `cow_send(peerId, message)` 把消息派给直接下级；`peerId` 是稳定节点标识，`peerName` 是可选显示名；
- 子 DSH：填写主 DSH 地址 + 密码，主动建立并维持长连接，消息直接进入会话输入队列执行；
- **dispatch**：主 DSH 派消息后立即返回，不等待、不轮询；排队交给 DSH Agent 输入队列；
- **complete**：子 DSH 回合结束时插件自动把本轮结论发回，主端以通知注入**派发时的原会话**，
  显示「这条通知触发了本轮回复。」并继续这一轮；
- **ask / answer**：子 DSH 用 `cow_send(kind="ask")` 向直接上级提问/审批，主 DSH 用
  `cow_send(replyTo=questionId)` 回答；回答回到同一 workspace + session 映射的子会话，
  不建任务、不发任务 ID；
- **询问由被询问节点的 Agent 处理**：它先自行判断；需要人工决定时调用 `ask_user_question`
  在 DSH 原生界面让用户输入；需要上级拍板时继续向上级 `cow_send(kind="ask")`，再逐级回报。
  COW 状态面板只显示「询问中」计数，不提供人工回答队列；
- 每条消息都带 `workspace`（id/name/path）、`session`（id/title）与 `approvalMode`；
  子端按 `peerId + workspace.id` 复用子会话：同一主 DSH、同一工作区只保留一个子会话，
  complete/ask 仍按每条消息里的主会话 `session.id` 回到对应原会话；同名节点不会串线，改名也不影响在途会话；
- 子 DSH 的 agent preset 可在设置页指定（`agentPreset`），会话会挂到对应工作区；
- 文件交换支持单个文件、目录递归（`cow_send_file` 传目录）与目录拉取（`cow_pull_dir`），逐文件 sha256 校验；
- 连接握手后启用 **AES-256-GCM 帧级加密**（密钥由共用密码 + 每次连接的 nonce 派生，重连即轮换）；旧客户端不支持时自动回落明文；
- 子 DSH 执行派发会话时的**审批请求自动转给主 DSH**：主端在设置页回答「允许一次/拒绝」，未回答或上级不可达时 fail-closed；
- 侧边栏 **「COW状态」** 面板：版本/在线/加密/询问中/活动统计、可拖拽缩放节点拓扑、连接明细（方向、连接时间、最近心跳、UUID）、活动时间线筛选（含发送者 → 接收者），每 4 秒刷新；设置页只保留节点名称、工作区、连接密码与上级配置。

## 配置

设置 → dsh-cow：

- **节点配置**：节点名称、附加说明、工作区根目录（数据目录，默认是用户主目录下的 `dsh-cow-root`，由代码按平台解析；留空保存也回落到它）、子会话 agent preset、文件上限；
- **作为主 DSH**：监听地址/端口、连接密码（至少 12 位）、已登记子节点列表；
- **作为子 DSH**：上级地址（`ws://host:port/cow/v1/channel` 或 `http://host:port/cow/v1`）、密码；保存后自动建立长连接并断线重连；
- 工作区根内的路径才能作为子会话工作目录；主端路径在本机不可用时，落到第一个根目录下的工作区同名目录。

## 协议（cow/v1，JSON over WebSocket）

端点：`/cow/v1/channel`，密码通过挑战—应答（或 `Authorization: Bearer <password>`）在升级握手时校验。

| 帧 | 方向 | 说明 |
|---|---|---|
| `auth.challenge` | 接受方 → 拨号方 | 挑战：nonce + salt |
| `hello` / `welcome` | 双向 | peerId、名称、版本、proof、ack 水位 |
| `msg.dispatch` | 主 → 子 | 派消息：messageId、text、**peerId + peerName**、workspace、session、approvalMode |
| `msg.complete` | 子 → 主 | 回合结束：replyTo、text（本轮结论）、peerId、peerName、workspace、session |
| `msg.ask` | 子 → 主 | 提问/审批：questionId、text、options[]、peerId、peerName、workspace、session |
| `msg.answer` | 主 → 子 | 回答：replyTo（questionId）、text、peerId、peerName |
| `file.*` | 双向 | 文件/目录分块传输、断点续传、目录清单 |
| `peer.message` | 双向 | 协作消息 |
| `ping` / `pong` | 双向 | 心跳（20s），断线自动退避重连 |

消息封套、complete/ask/answer 语义与文件事件详见 [docs/protocol.md](docs/protocol.md)。

## 拓扑（一父多子，无深度概念）

- 每个节点只有**直接上级**与**直接下级**，不存在全局层级/depth；每个节点只认识自己的一级邻居。
- 子节点 hello 里上报自己的上级，父节点若发现对方正是自己的上级，会拒绝把它再当作下级接入（避免互为上下级）。
- 消息只能派给直接下级，不能派回上级；文件交换同理。

## 一键接入子节点

```sh
node scripts/join-child.mjs --home ~/.dsh-childA --name "子DSH-A" \
  --parent ws://<主DSH地址>:59999/cow/v1/channel --password <主DSH连接密码> \
  --root ~/cow-workspaces/A --launch
```

脚本会创建独立 `DSH_HOME`（web profile + 本地 dsh-cow 插件）、写入节点身份与上级地址、复制当前用户的模型凭据（`--no-credentials` 可关闭），并可选后台启动。密码策略是**每个节点各自设置**：子节点用上级的密码；中间节点的下级用中间节点自己的密码（在主 DSH 页配置）。

## 工具

- `cow_status`：本机状态、连接数、待回答询问；
- `cow_peers`：节点列表（在线状态、版本、说明）；
- `cow_send`：发消息。目标节点用 `peerId`（稳定节点标识，cow_…）指定；`peerName` 可选，仅作显示名提示（名称可能随时变化，不参与路由/校验）；默认 `kind=dispatch` 派给直接下级并立即返回；`kind=ask` 向直接上级提问并等待回答；带 `replyTo` 时回答提问（回到子会话）；
- `cow_doctor`：生成本机诊断包（版本/配置/加密状态/文件统计/活动），返回 JSON 路径；
- `cow_send_file` / `cow_receive_file`：发/取文件（单个或目录、断点续传、sha256），用 `peerId` 指定节点；
- `cow_pull_dir`：拉取远端整个目录（`peerId`）；
- `cow_cancel_file` / `cow_set_file_policy`：取消传输 / 调整对端文件策略。

## 已知限制

- 事件至少一次投递，接收方去重窗口为内存 512 条；进程重启后窗口清空。
- 通道业务帧已用 AES-256-GCM 加密；握手帧仍是明文，密码强度决定抗离线猜测能力，跨公网建议随机密钥 + 隧道。
- 待回答询问只保存在内存，进程重启会丢失。
- 文件按文件顺序传输，不做带宽限制；目录很大时会占用较长时间。
- 子会话并发由 DSH Agent 输入队列决定，dsh-cow 不额外限流。

## 安装

```bash
dsh plugin --profile desktop add link:/path/to/dsh-cow
```

## 开发

```bash
node scripts/build-client.mjs   # 打包设置页
node --test test/*.test.mjs     # 单元 + WebSocket 集成测试
```

设计评审与开源方案对比：[docs/design-review-2026-11.md](docs/design-review-2026-11.md)；A2A 迁移可行性：[docs/a2a-migration-assessment.md](docs/a2a-migration-assessment.md)。

状态文件在 `$DSH_HOME/cow/`（instance.json、peers.json、settings.json、channel-*.json）。
