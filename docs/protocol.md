# cow 线协议 v1

dsh-cow 的所有协同业务都走 **一条 WebSocket 双工长连接**，不再有跨实例的 HTTP 任务接口。
文字端口里的 `<endpoint>` 形如 `http://mac-mini.local:59999/cow/v1`。

- 传输：WebSocket（RFC 6455），文本帧 JSON，单帧上限 512 KiB
- 路径：`/cow/v1/channel`
- 鉴权：挑战—应答（见下节）；兼容 `Authorization: Bearer <password>` 头
- 编码：UTF-8 JSON；时间戳为 ISO 8601 字符串
- 对端：只允许**直接上级 / 直接下级**；任务与文件都只发给直接下级

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
  "instanceId": "cods_…",
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
| `hello` / `welcome` | 双向 | `protocol, instanceId, displayName, uuid, ackSeq, proof` | 握手 |
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

`data` 是 `{"event":"task.assign","payload":{…}}` 的 AES-256-GCM 密文，AAD 为 `cow/v1/e2e`；
文件分块也在 `payload` 内，因此同样被加密。`hello` / `welcome` / `auth.challenge` / `ack` / `ping`
保持明文，便于握手与排障。任一侧未声明 `enc` 时该连接回落明文（升级过渡期）。

`event` 是业务类型字符串，`payload` 见下节。发件箱按 peer 保留最近 300 条，
收到 ack 后丢弃；接收方按 `msgId` 去重（内存窗口 512 条）。

## 3. 业务事件

### 3.1 任务

| event | 方向 | payload |
|---|---|---|
| `task.assign` | 主 → 子 | `taskId, prompt, title, cwd, workspaceName, timeoutSec, caller, callerLabel` |
| `task.progress` | 子 → 主 | `taskId, seq, kind, text, tool?, status?, position?` |
| `task.result` | 子 → 主 | `taskId, status, summary, error, artifacts[]` |
| `task.cancel` | 主 → 子 | `taskId, reason` |
| `task.question` | 子 → 主 | `taskId, questionId, question, options[], timeoutSec` |
| `task.answer` | 主 → 子 | `taskId, questionId, answer` |

`task.assign` 的 `cwd` 必须在子端 `allowedRoots` 内；`workspaceName` 用于把子端会话挂到
与主端同名的工作区。子端同一时刻只执行一个任务（`maxConcurrentTasks: 1`），
其余进入 FIFO 队列（默认 `maxQueuedTasks: 8`），超出直接拒绝 `too_many_tasks`。
同一个 `taskId` 重复下发会被忽略，避免 at-least-once 造成重复执行。

排队中的任务还会回传 `status: "queued"` 与 `position`（1-based），开始执行时回传 `status: "running"`，父端据此把任务从 running 改回 queued；`task.progress.kind` 取值：`phase`（阶段）、`turn`（新一轮）、`tool`（工具调用）、
`text`（助手文本，800ms 节流）、`question` / `answer`、`done`、`error`。
`seq` 在单个任务内递增（可能与子端注入的阶段帧重复，消费方按条数容错即可）。

`task.result.status`：`succeeded` | `failed` | `canceled`。
`task.result.artifacts[]`：任务期间 cwd 下新增/修改文件的清单（`name,path,bytes,sha256,modifiedAt`，
最多 50 个）；主端会自动拉取 ≤10MB 的条目到 `$DSH_HOME/cow/artifacts/<taskId>/`。

### 3.2 离线队列

主端发送 `task.assign` 时如果对端不在线，任务进入**离线队列**（默认保留 2 小时）：

- 任务快照 `status: "queued"`，带 `queuedAt`、`queueExpiresAt`、`attempts`
- 对端 `hello` 到达时自动 `flushQueue`，把未过期任务重新下发并转 `running`
- 过期任务判 `failed`（错误说明可用 `cow_retry` 重试）
- `task.cancel` 对排队任务只做本地取消，不等待对端

### 3.3 远端提问

子端 Agent 需要发起方决策时调用 `cow_ask`，主端在任务快照的 `pendingQuestion`
里看到问题与选项，再用 `cow_answer` 回传：

```json
{ "taskId": "cowtask_…", "questionId": "q_…", "question": "交付用 A 还是 B？", "options": ["A", "B"], "timeoutSec": 300 }
```

子端工具阻塞等待 `task.answer`（默认 300s，超时返回 `{ok:false,error:"timeout"}`）。
问题只存在于内存与任务快照，进程重启后丢失。

审批接管：子端执行委派任务时若 DSH 触发 `approval/request`，插件把请求转成同样的
`task.question`（文本“子 DSH 请求审批：<tool>（<reason>）”，选项“允许一次/拒绝”），
把回答映射为 `allowed-once` / `rejected`；超时、取消或主端不可达返回 `unavailable`（fail-closed）。
只接管委派任务会话，本机自己的会话审批仍走本机 answerer。

### 3.4 协作消息

`peer.message`：`{ message, targetSessionId? }`，仅做通知，不保证被 Agent 消费。

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
| GET | `/api/cow/doctor` | 本机设置页生成诊断包（同源，无 token） |
| POST | `/api/cow/answer` | 设置页回答远端提问 |

跨实例的任务、进度、提问、文件块全部走 WebSocket，不走上表接口。

## 6. 错误码

| code | 含义 |
|---|---|
| `invalid_request` | 参数缺失/类型错 |
| `payload_too_large` | prompt/context/请求体超限 |
| `unauthorized` | 证明/token 无效 |
| `forbidden` | 工作目录越界或未配置 allowedRoots |
| `not_found` | 任务/传输不存在 |
| `conflict` | 任务仍在排队或执行，不能续聊 |
| `too_many_tasks` | 运行 + 排队已满 |
| `timeout` | 执行超时（任务 `error.code`，同时取消 Agent） |
| `interrupted` | 进程重启中断（任务 `error.code`） |
| `unavailable` | 宿主缺 agents/sessions、模型不可用或 dsh-cow 被禁用 |
| `internal` | 未预期错误 |
