# cow 线协议 v1（纯消息）

dsh-cow 的所有协同业务都走 **一条 WebSocket 双工长连接**，没有跨实例 HTTP 任务接口，
也没有任务、认领或任务队列。文字端口里的 `<endpoint>` 形如 `http://mac-mini.local:59999/cow/v1`。

- 传输：WebSocket（RFC 6455），文本帧 JSON，单帧上限 512 KiB
- 路径：`/cow/v1/channel`
- 鉴权：挑战—应答（见下节）；兼容 `Authorization: Bearer <password>` 头
- 编码：UTF-8 JSON；时间戳为 ISO 8601 字符串
- 对端：只允许**直接上级 / 直接下级**；消息与文件都只发给直接下级

## 1. 连接与鉴权

接受方在升级成功后先发挑战：

```json
{ "type": "auth.challenge", "nonce": "base64url", "salt": "base64url" }
```

拨号方用共用密码计算证明（`hashJoinPassword` 为 scrypt 派生，`sha256` 为十六进制摘要）：

```text
proof = sha256(nonce + ":" + hashJoinPassword(password, salt))
```

然后发 `hello`：

```json
{
  "type": "hello",
  "protocol": "cow/v1",
  "peerId": "cods_…",
  "displayName": "叶超的MacMini",
  "uuid": "…",
  "parent": "cods_parent…",
  "ackSeq": 0,
  "enc": 1,
  "proof": "…"
}
```

`enc: 1` 表示支持帧级加密；`welcome` 同样携带该字段。只有双方都声明支持时才加密，
否则回落明文（兼容旧客户端）。

接受方校验 proof（或旧的 Bearer 头），回 `welcome`（同样带自己的 proof 与 ack 水位）。
任一侧 10 秒内未完成认证即关闭。已登记 peer 的入站连接按 `peer.label` 归位；
若对方声称的上级正是自己，拒绝把上级当子节点接入。

## 2. 帧封套

业务事件统一包在事件封套里，实现至少一次投递：

| type | 方向 | 字段 | 说明 |
|---|---|---|---|
| `hello` / `welcome` | 双向 | `protocol, peerId, displayName, uuid, ackSeq, proof` | 握手 |
| `auth.challenge` | 接受方 → 拨号方 | `nonce, salt` | 挑战 |
| `event` | 双向 | `seq, msgId, at, event, payload` | 业务事件 |
| `ack` | 双向 | `seq` | 累计确认 ≤ seq 已收到 |
| `ping` / `pong` | 双向 | `t` | 20s 心跳，65s 无活动判死 |
| `bye` | 双向 | `reason` | 优雅关闭 |

### 2.1 帧级加密

双方完成挑战握手后，用同一份密码派生材料与本次连接的 `nonce` 生成 256 位会话密钥：

```text
key = HKDF-SHA256(base = passwordHash, salt = nonce, info = "cow/v1/e2e", 32)
```

拨号方的 `base = hashJoinPassword(password, challenge.salt)`，接受方直接用自己的
`passwordHash`；两者相等，因此无需在连接上传输密钥。`nonce` 每次连接都变化，
重连即轮换密钥，密钥不落盘。

启用加密时，`event` 帧变为：

```json
{ "type": "event", "seq": 12, "msgId": "cods_a:12", "at": "…", "enc": { "v": 1, "iv": "…", "tag": "…", "data": "…" } }
```

`data` 是 `{"event":"msg.dispatch","payload":{…}}` 的 AES-256-GCM 密文，AAD 为 `cow/v1/e2e`；
文件分块也在 `payload` 内，因此同样被加密。`hello` / `welcome` / `auth.challenge` / `ack` / `ping`
保持明文，便于握手与排障。任一侧未声明 `enc` 时该连接回落明文（升级过渡期）。

`event` 是业务类型字符串，`payload` 见下节。发件箱按 peer 保留最近 300 条，
收到 ack 后丢弃；接收方按 `msgId` 去重（内存窗口 512 条）。

## 3. 消息信封

四条消息共用同一个信封。`peer` 是这条会话所属的**子节点标签**（主端视角），
子端按 `peerId + workspace.id` 复用本地子会话（同一工作区一个）；每条消息里的 `session.id` 记录主端原会话，complete/ask 据此回到对应会话。`peerName` 只是显示名。

```json
{
  "kind": "dispatch",
  "messageId": "msg_…",
  "questionId": "",
  "replyTo": "",
  "peerId": "cow_6f1c…",
  "peerName": "子 DSH-A",
  "text": "…",
  "options": [],
  "workspace": { "id": "cods_workspace…", "name": "项目名", "path": "/abs/path" },
  "session": { "id": "cods_session…", "title": "主会话" },
  "approvalMode": "follow",
  "createdAt": "2026-11-15T00:00:00.000Z"
}
```

### 3.1 dispatch（主 → 子）

主 DSH 用 `cow_send(peerId, message, peerName?)` 发送，`peerId` 是稳定节点标识；
`peerName` 是可选的显示名提示，名称可能随时变化，不参与校验。消息**只入队、立即返回**，不等结果：

```json
{
  "kind": "dispatch",
  "messageId": "msg_…",
  "peerId": "cow_6f1c…",
  "peerName": "子 DSH-A",
  "text": "把周报整理成 markdown",
  "workspace": { "id": "…", "name": "docs", "path": "/Users/yechao/work/docs" },
  "session": { "id": "…", "title": "周报" },
  "approvalMode": "follow"
}
```

子端按工作区键（`peerId + workspace.id`）找到/新建子会话，把 `text` 作为一条用户消息交给 Agent；
同一工作区复用同一会话，子会话标题为 `[COW] <工作区名>`。显示名重名时主端会自动追加实例后缀，peerId 始终不变。
子端工作目录取 `workspace.path`（必须在本机 `allowedRoots` 内），不可用时落到第一个根目录下的
`workspace.name` 同名目录。

### 3.2 complete（子 → 主）

子端回合结束（Agent `whenIdle` + 子代理收敛 + 会话 flush）后自动发送：

```json
{
  "kind": "complete",
  "messageId": "msg_…",
  "replyTo": "msg_dispatch…",
  "peerId": "cow_6f1c…",
  "peerName": "子 DSH-A",
  "text": "周报已生成：…",
  "workspace": { … },
  "session": { … },
  "createdAt": "…"
}
```

主端把 `text` 以通知（`source.kind = "notification"`）注入 `session.id` 对应的**原会话**，
从而开启新一轮回复；界面上显示“这条通知触发了本轮回复。”。
同一 `messageId` 重复送达只注入一次。

### 3.3 ask / answer（子 ↔ 主）

子端在派发会话里用 `cow_send(kind="ask")` 提问，信封复用原 dispatch 的
`peerId/peerName/workspace/session`，并带 `questionId`（默认等于 messageId）与 `options[]`：

```json
{
  "kind": "ask",
  "messageId": "q_…",
  "questionId": "q_…",
  "peerId": "cow_6f1c…",
  "peerName": "子 DSH-A",
  "text": "交付用 A 还是 B？",
  "options": ["A", "B"],
  "workspace": { … },
  "session": { … }
}
```

主端把询问注入原会话，由**被询问节点的 Agent** 处理：先自行判断；需要人工决定时调用
`ask_user_question` 在 DSH 原生界面让用户输入；需要上级拍板时继续用 `cow_send(kind="ask")`
向上级请示。最终用 `cow_send(replyTo=questionId, message=…)` 回答（可带 `peerId` 定位），
回答以 `msg.answer` 发回同一子节点：

```json
{ "kind": "answer", "replyTo": "q_…", "peerId": "cow_6f1c…", "peerName": "子 DSH-A", "text": "A", "workspace": { … }, "session": { … } }
```

子端收到 `msg.answer`：若有工具/审批正在等待该 `questionId`，直接兑现等待；
否则作为一条 `[COW 回答]` 输入唤醒同一子会话。

提问由发起端内存中的等待器承接；超时（默认 300s）返回失败。COW 状态面板只展示
「询问中」计数，不作为人工审批队列。审批接管：子端执行派发会话时若 DSH 触发
`approval/request`，插件把它转成同样的 `msg.ask`（文本“子 DSH 请求审批：<tool>（<reason>）”，
选项“允许一次/拒绝”），把回答映射为 `allowed-once` / `rejected`；超时、取消或主端不可达
返回 `unavailable`（fail-closed）。只接管派发会话，本机自己的会话审批仍走本机 answerer。

### 3.4 协作消息

`peer.message`：`{ message }`，仅做通知，不保证被 Agent 消费。

## 4. 文件交换

所有文件事件都只发给直接下级；接收方写入自己的 `allowedRoots`。

| event | 方向 | payload |
|---|---|---|
| `file.put` | 发送方 → 接收方 | `transferId, name, size, sha256` |
| `file.resume` | 接收方 → 发送方 | `transferId, offset` |
| `file.chunk` | 发送方 → 接收方 | `transferId, seq, data(base64)` |
| `file.progress` | 接收方 → 发送方 | `transferId, bytes, total` |
| `file.done` | 发送方 → 接收方 | `transferId` |
| `file.result` | 接收方 → 发送方 | `transferId, path, bytes, sha256` |
| `file.error` | 双向 | `transferId, message` |
| `file.get` | 请求方 → 持有方 | `transferId, path` |
| `file.list` | 请求方 → 持有方 | `transferId, path` |
| `file.list.result` | 持有方 → 请求方 | `transferId, path, files[{name,size}]` |
| `file.cancel` | 双向 | `transferId` |

- 分块 256 KiB，base64 传输；落盘前写 `.part` + `.part.json`，支持断点续传与 sha256 校验
- 单文件上限 `maxFileMB`（默认 50，1–1024），并发上限 `maxConcurrentFiles`（默认 4）
- 目录：发送方按相对路径逐个文件发送（`name = 根目录名/相对路径`）；接收方会创建父目录
- 拉取目录：先 `file.list` 拿相对清单，再逐文件 `file.get`

## 5. 本机 HTTP 管理接口

宿主 web 端口上还挂了少量本机接口，供 CLI / 设置页使用（只监听本机，不要暴露公网）：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/cow/v1/health` | 无鉴权的可达性探测 |
| GET | `/cow/v1/status` | 需要 `x-cow-token`（`$DSH_HOME/cow/http.token`） |
| POST | `/cow/v1/files/send` | 本机发文件/目录 |
| POST | `/cow/v1/files/receive` | 本机取文件 |
| GET | `/cow/v1/channel` | WebSocket 升级；普通 GET 返回 426 |
| GET | `/api/cow/state` | 设置页状态（同源） |
| POST | `/api/cow/answer` | 设置页回答远端询问（questionId） |

跨实例的消息、提问、文件块全部走 WebSocket，不走上表接口。

## 6. 错误码

| code | 含义 |
|---|---|
| `invalid_request` | 参数缺失/类型错 |
| `payload_too_large` | 消息/请求体超限 |
| `unauthorized` | 证明/token 无效 |
| `forbidden` | 工作目录越界或未配置 allowedRoots |
| `not_found` | 传输/询问不存在 |
| `conflict` | 回答未送达或状态冲突 |
| `unavailable` | 宿主缺 agents/sessions、模型不可用或 dsh-cow 被禁用 |
| `internal` | 未预期错误 |
