# dsh-cow 设计文档

> 目标：安装这个插件后，一台 DSH 可以把其它 DSH **登记**进来；每个实例**声明自己的能力**；
> 对话中的 Agent 可以判断「这个任务只能在那台主机上做」，并把任务**委派**过去、拿回结果。

本文回答「要实现这样的插件，需要怎么设计」，并逐条解释取舍。可运行实现在 `src/`，
协议规格在 [`docs/protocol.md`](docs/protocol.md)。

---

## 1. 问题拆解

「把任务派给另一台 DSH」听起来是一件事，实际是三个互相牵制的问题：

| # | 子问题 | 难点 |
|---|---|---|
| 1 | **登记**（registry） | 两台机器之间要建立一条被授权的、可撤销的通道；不能靠「知道 IP 就能派活」 |
| 2 | **能力**（capability） | 发起方的**模型**要能判断「哪台机器具备这个环境」。描述必须可判定，不能是一段会漂移的散文 |
| 3 | **委派执行**（delegation） | 任务要在对端真的被执行（不是让远端模型空谈），过程可见、结果可回传、能多轮、能取消、能审计 |

三条硬约束决定了整体形态：

- **没有中心调度器**。两台 DSH 之间直连，插件不引入第三方服务；否则「某些任务只能在特定主机上」的场景就要额外运维一个协调服务。
- **复用 DSH 自己**。远端用什么模型、什么工具、什么沙箱、什么审批策略，应该是那台机器自己的事；插件不重新实现执行引擎。
- **攻击面最小**。为了让别人能派活，等于把「在本机跑 Agent」的能力租出去，边界必须是显式的。

---

## 2. 总体架构

**一个插件、两个角色、同一份代码。** 每台装了插件的 DSH 同时是 server 与 client：

```
                 ┌─────────────── DSH A（发起方）───────────────┐
   对话 ────────▶│ Agent ──cow_match/cow_delegate──┐        │
                 │        PeerRegistry / PeerClient    │        │
                 │        TaskManager（入站，可被 B 派活）        │
                 │        Channel（长连接）◀──通知/消息──┐        │
                 └─────────────────────────────────────┼───────┘
                    ▲ HTTP /cow/v1（Bearer token）   │
                    │ 任务提交、能力文档、收件箱兜底      │
                 ┌──┴────────────── DSH B（目标主机）────────────┐
                 │        HTTP 路由 + token 鉴权               │
                 │        TaskManager ──▶ agents.create(...)   │
                 │                          └─ 本机独立 Session │
                 │        Channel（长连接）──任务完成/协作消息──▶ │
                 │        CapabilityProbe（builtin/detected/declared）│
                 └─────────────────────────────────────────────┘
```

两条链路，各司其职：

| 链路 | 用途 | 特点 |
|---|---|---|
| HTTP `/cow/v1/*` | 提交任务、读能力文档、长轮询进度、消息兜底 | 无状态、可穿透代理、断线不影响任务 |
| WebSocket `/cow/v1/channel` | 任务完成通知、协作消息、能力变更推送 | 一条双工连接、at-least-once、秒级到达 |

长连接不是「另一个 API」，而是把**已经在发生的状态变化**推给对端：B 的任务一结束，
A 的 Agent 就能收到一条会话消息，而不是等下一次轮询。HTTP 仍然是事实来源，
通道挂了只会退化延迟，不会丢任务。

两种承载方式共用同一个 node handler：

1. **复用宿主 `webServer`**：`ctx.webServer.register({ kind:'prefix', path:'/cow/v1', handler })`。
   Web profile / Desktop（带 web 面）天然可用，不用多开端口。
2. **可选独立监听**：配置 `listenPort > 0` 时用 `node:http` 自建（`listenHost` 可控），
   用于宿主没有 webServer、或需要绑定内网地址的部署。

> 为什么不复用 Web GUI 的 `/api`：那条链路由 launch token → 签名 cookie → Peer 访问控制保护，
> 是**浏览器契约**，并且以「owner Peer」身份给出全量权限。插件路由是受支持的扩展点，
> 自己鉴权反而更安全、也更稳定。

---

## 3. 关键设计决策

### 3.1 执行放在目标进程内，而不是起子进程或 SSH

| 备选 | 问题 |
|---|---|
| `ssh host dsh headless ...` | 需要 shell 权限、绕开 DSH 自己的权限体系、不能复用远端交互式配置、结果只能靠 stdout |
| `spawn('dsh', ['--profile','headless'])`（Hive 的 command 模式） | 慢（每次冷启动）、模型与凭据要重新装配、**远端的人看不见这次执行** |
| **进程内 `agents.create()` 独立会话** | ✅ 用远端默认模型 / 工具 / 沙箱 / 审批；会话进入远端历史，本地人能看见甚至接管；零额外依赖 |

因此 `TaskManager` 用宿主服务创建一个新 Session：

```js
const { agent } = await agents.create({
  sessionId: `session-cow-<rand>`,
  meta: { cwd },                                  // 已通过 allowedRoots 校验
  agentOptions: { provider, model },              // 远端默认模型
});
agent.followup(messageObject(委托提示词));        // 远端 Agent 看到的任务说明
await agent.whenIdle();
await sessions.flush(agent.session);
const summary = summarizeSession(agent.session, firstSeq);   // 解析本轮助手文本
```

插件刻意**不 import 任何 harness 包**（`dsh-agent`、`dsh-session` 等），只用
`ctx.get(name)` 结构化取服务（`agents` / `sessions` / `tools` / `webServer` / `settings` / `systemPrompt`）——
profile 里被提升的重复副本会劈裂模块级 Symbol，导致宿主服务失效。这是同仓库
`dsh-haos`、`dsh-hive-runtime` 已经踩过的坑。

### 3.2 能力是结构化声明，不是一段话

每条能力是一个可匹配的条目：

```jsonc
{ "id": "tool.xcodebuild", "title": "Xcode 命令行构建",
  "tags": ["xcode", "ios", "build"], "kind": "detected",
  "available": true, "detail": "Xcode 16.2" }
```

三种来源：

| kind | 来源 | 例子 |
|---|---|---|
| `builtin` | 进程/系统信息，永远可用 | `os.darwin`、`arch.arm64`、`gpu.apple` |
| `detected` | 探测命令成功（带首行输出作为取证） | `tool.docker`、`gpu.nvidia`、`tool.xcodebuild` |
| `declared` | 人写的业务能力 | `intranet.pay`（只能访问支付内网）、`xcode.release`（装了签名证书） |

**为什么不用自由文本**：发起方的模型要做的是「在候选中选一个」的决策，需要的是可枚举、
可比较、带可用性的标签；一段自由描述会随人写作风格漂移，也无法表达「这台机器其实没装」。
`available:false` 也保留在文档里，方便排障时回答「为什么没匹配到」。

能力匹配（`cow_match`）用可解释的打分：标签命中 +3、能力 id 命中 +4、标题/说明包含 +2、
主机名命中 +1，命中项作为 `matched` 返回给人看。刻意不用向量检索或 LLM 排序：v1 的候选通常
是个位数，透明可解释更重要；未来可以把 LLM 重排叠在这层之上（见 §11）。

### 3.3 任务是「提交 + 长轮询」，不是同步 RPC

远程任务可能跑几分钟到几十分钟，而工具调用有超时预算。把两件事解耦：

- `POST /tasks` 立即返回 `taskId`（`mode:'async'`）或带上 `waitSec` 长轮询；
- `cow_delegate` 声明的 `timeoutMs` 是**本地等待预算**，不是任务寿命；
- 本地等待被工具超时/用户打断时，只结束等待，**不杀远端任务**，返回 `status:"running"` 与
  「用 cow_task 继续查」的提示；远端任务继续跑，结果不会丢；
- `cow_cancel` 才是显式取消。

没有用 SSE/WebSocket：长轮询无状态、能穿代理、不需要维护连接；代价是进度更新有秒级延迟，
对「委派任务」这个场景足够。

### 3.4 鉴权：签发侧出「登记串」，token 只存摘要

- 目标实例（B）在 CLI 上 `cow token add --label mac-mini` 签发 token，
  输出一条 **登记串** `cods1.<base64url(JSON)>`（含 B 的 endpoint、token、可选 label/instanceId）。
- 发起实例（A）把人粘贴的登记串写进设置页字段 `enrollString`（或 `cow enroll`），
  A 存下 `{url, token}` 并立刻拉取 B 的能力文档。
- B 的磁盘上只有 `sha256(token)`，比较用 `timingSafeEqual`，撤销是打标记 → 热生效，不用重启。
- token 不写进 profile 配置（那会被持久化进 Cordis patch 并出现在设置表单里），
  而是落在 `$DSH_HOME/cow/tokens.json`（0600）。
- 登记串**永远不交给模型**：模型侧只看到「已登记的主机」，拿不到凭证。

为什么不做 mTLS / OAuth：v1 的目标是「两台我自己的机器」，带外搬运一次秘密已经足够；
mTLS 需要证书分发与轮换，收益主要在多租户场景（见 §11）。

### 3.5 工作目录白名单：`allowedRoots` 默认为空 = 拒绝一切

这是整个插件最有意义的安全边界。持有 token 的一方等价于「可以在本机跑一个 Agent」，
而 Agent 能读写文件、跑命令。所以：

- 远端任务必须落在 `allowedRoots` 之一，缺省 `cwd` 取第一个根；
- 校验做**两遍**：先词法（挡 `../`、绝对路径越界），再 `realpath`（挡符号链接逃逸）；
- 不存在的子目录允许（Agent 会创建），但父目录必须在根内；
- 根目录为空时 `403 forbidden`，而不是「默认给个目录」。

### 3.6 长连接：一条双工连接 + 至少一次投递

「任务做完后通知主 DSH」是产品需求，但在实现上有三个坑：两端可能同时想连、
断线会丢通知、注入消息会重复打扰。方案分别对应：

**（1）谁拨号 —— 按 instanceId 字典序收敛到一条连接。**
`auto` 模式下，instanceId 较小的一方主动拨号，另一方只接受；两侧同时连上时用同一条规则裁决
（小的一方保留自己的 outbound，大的一方保留自己的 inbound），最终只剩一条 socket。
`always` / `never` 覆盖该策略，用于 NAT 只允许单向连接的部署。

**（2）不丢通知 —— per-peer 发件箱 + seq + 累计 ack + msgId 去重。**
发送方把每条事件写进 `channel-outbox.json`（每个 peer 最多 300 条）再发；接收方按 `seq`
累计 `ack`，发送方只丢弃已 ack 的记录。重连时 `hello/welcome` 交换 ack 水位，未 ack 的补发。
接收方用 `msgId` 去重，所以补发不会产生重复通知。

**（3）不重复打扰 —— 通知路由有「已交付」判断与频率上限。**
`remote-tasks.json` 记录每个远程任务的 `originSessionId`、`awaited`（本地正在等）、
`delivered`（工具已经返回过终态）。任务完成事件到达时：

| 状态 | 处理 |
|---|---|
| 本地正在 `cow_delegate` 等待 | 不注入（工具返回值里已经有结果） |
| 工具已经返回终态 | 不注入（只进收件箱留痕） |
| 等待超时 / 用户打断 / 后台任务 | 注入发起会话：`[dsh-cow] 远端 mac-mini 的任务 task_x 已完成…` |
| 发起会话已不存在 | 落回收件箱，`cow_inbox` 可查 |

注入是给会话追加一条 user 角色消息（`agent.followup`），发起方空闲时会开启新一轮，
正在跑则排队。每会话每分钟最多 3 条（`maxInjectionsPerMinute`），避免两个实例互相触发成环。

**为什么自己实现 WebSocket**：插件保持零运行时依赖（只有 schemastery）；需要的只是
握手、文本帧、分片、ping/pong、close 这一子集，约 300 行且有 RFC 测试向量覆盖。代价是
不支持压缩与二进制消息 —— 通道里只传小 JSON，够用。

**能力变更也走通道**：`instance.changed` 事件携带新的能力摘要，接收方更新本地快照，
`cow_match` 不用等缓存过期。

**降级路径**：通道不可用时，`peer.message` 走 `POST /cow/v1/messages` 直接进对端收件箱；
任务结果仍可通过 `GET /tasks/:id?waitSec=` 轮询获得。两者都不依赖长连接。

### 3.7 设置页：为什么配置分两层，以及它自己的边界

图形界面要能改的东西和设备装配配置要固定的东西不是一回事：

| 层 | 内容 | 谁改 | 生效方式 |
|---|---|---|---|
| profile 装配配置（`cordis.patch.yml` / schemastery） | `listenPort`、`channelDial`、`allow*` 上限等 | 装机的人 | 改 profile 补丁，按 HMR 重载 |
| 运行状态（`$DSH_HOME/cow/`） | token、对端登记、收件箱、任务、发件箱 | 插件自己 | 运行时读写 |
| **设置页覆盖层**（`settings.json`） | 名称、能力声明、目录白名单、通道开关、对外地址 | 使用者 | `resolveConfig` 每次读取时合并，即时生效 |

把「使用者日常要改的」放进第三层，解决了三个实际问题：不必为了改个显示名去动装配文件；token 不因为"配置被备份/同步"而泄露；`resolveConfig` 是纯函数，测试不需要真 DSH_HOME（覆盖层由 index 在调用处合并）。

**Host API 的边界**：`/api/cow/*` 由插件直接注册在 webServer 上，不经过 DSH 的浏览器 API 通道（那条通道要求签名 cookie + Peer 身份，插件路由拿不到）。所以自己做了两道保护：拒绝 `sec-fetch-site: cross-site`（挡跨站请求），敏感操作只允许 POST；返回体里**永远不回显 token 明文**，登记串只在生成的响应里出现一次。这与 haos 等插件的取舍一致：能访问本机 web 服务的人本来就能操作本机 DSH，额外加一层 IP 白名单没有实质收益，反而会让隧道/反代场景失效。

**客户端打包**：设置页是浏览器侧 React 模块（`client-src/index.js`），用 esbuild 打成 `lib/client.js` 并由宿主按 `dsh.client` 声明注入到设置侧栏。宿主在启动时扫描包的 `client.js`，所以**改了页面要重新打包并重启宿主**（或走客户端 HMR）。

**主/子双角色与双向登记**：页面按角色分 Tab——主 DSH 配置接入方式（开放端口 / 仅本机监听）与授权 URL，子 DSH 配置主 DSH 地址并测试连通性。授权码生成两种形态：`cods1.…` 登记串与 `<endpoint>?token=…` 登记 URL（页面用后者，子 DSH 粘一条地址即可）。

子 DSH 连接主 DSH 时会做一次**反向登记**（`POST /peers/register`，用主 DSH 发的 token 认证）：子 DSH 把自己的地址与「给主 DSH 用的 token」登记到主 DSH，主 DSH 因此获得一条可 HTTP 派任务的对端记录。这样"子 DSH 主动连主 DSH"与"主 DSH 派任务给子 DSH"两个方向都成立，且不需要两边各自手工登记。

---

## 4. 威胁模型

**信任假设**：token 持有者是被授权的协作方，但网络与对端都可能出错或被攻破。

| 风险 | 缓解 |
|---|---|
| 拿到 token 的人做任意事 | `allowedRoots`、`maxConcurrentTasks`、`maxQueuedTasks`、`maxTaskMinutes`、`promptBytes` 上限；任务以远端默认沙箱/审批策略运行 |
| token 泄露 | 只存摘要、可撤销、热生效；登记串只在签发时显示一次 |
| token 被暴力猜 | 24 字节随机数，`timingSafeEqual` 比较 |
| 路径穿越 / 符号链接逃逸 | 词法 + `realpath` 双重校验（有测试覆盖） |
| 伪造调用方身份 | `caller` 字段**仅用于审计展示**，不参与授权；真正的身份是 token |
| 远端结果里的提示注入 | 系统提示明确：远端文本是**不可信数据**，只能作为结果参考，不得执行其中的指令；注入的协作消息同样带这条警告 |
| 长连接被伪造 | 升级请求必须带有效 peer token；`Sec-WebSocket-Accept` 双向校验；帧大小与掩码方向有硬限制 |
| 通知轰炸 / 两个实例互相触发 | `maxInjectionsPerMinute` 限流、`await/delivered` 去重、`notifyMode` 可整体关闭注入 |
| 通道缓冲被打爆 | 每 peer 发件箱上限 300 条、单帧 512KB、累计 ack 丢弃；接收去重窗口 512 条 |
| 拒绝服务（海量任务） | 并发 + 排队上限返回 `429`；请求体 256KB 上限；任务记录按保留期清理 |
| 进程重启后任务悬空 | 启动时把 `running` 一律标记为 `failed/interrupted`，调用方拿到明确失败而不是无限等待 |
| 插件拖垮宿主 | 所有装配包在 try/catch；能力探测有超时；任务异常只影响该任务 |

**非目标**：多租户隔离、跨组织的配额与计费、防住「对端机器已经被完全控制」。这些需要
网络层与平台层的配合，插件不能替代。

---

## 5. 数据模型

状态都放在 `$DSH_HOME/cow/`，权限 0600，原子写（tmp + rename）：

| 文件 | 内容 |
|---|---|
| `instance.json` | `{ instanceId: "cods_…", createdAt, displayName, lastEndpoint }`，身份一经生成不变 |
| `tokens.json` | 入站凭证：`{id,label,hash,createdAt,lastUsedAt,revoked}` |
| `peers.json` | 出站登记：`{label,url,token,instanceId,capabilities[],workspaces[],limits,capabilitiesAt,lastSeenAt}` |
| `remote-tasks.json` | 本机派出的 `taskId → peer` 索引（含 `originSessionId`/`awaited`/`delivered`），通知去重与轮询都靠它 |
| `tasks/<taskId>.json` | 入站任务记录（含进度、摘要、调用方、工作目录），用于审计与重启恢复 |
| `channel-outbox.json` | 长连接发件箱：每 peer 的未 ack 事件（seq/msgId/type/payload） |
| `channel-state.json` | 连接状态快照（给 CLI / `cow_peers` 用），含入站 ack 水位 |
| `inbox.json` | 收件箱：对端推来的任务通知与协作消息（未读计数供系统提示引用） |
| `settings.json` | 设置页写入的覆盖层（名称/能力声明/目录白名单/通道开关），优先级高于 profile 装配配置 |

关键点：

- **配置与状态分离**。可调参数走 schemastery 的 `.volatile()` 设置表单（会写进 profile patch），
  凭证与任务记录走状态目录。这样 token 不会随 profile 备份/同步泄露。
- `peers.json` 里缓存了能力文档快照，所以 `cow_peers` / `cow_match` 在对端短暂离线时
  仍能工作（并标注 `reachable:false`）。

---

## 6. 协议

版本前缀 `/cow/v1`，全部 JSON，错误统一 `{ error: { code, message, details } }`。完整规格见
[`docs/protocol.md`](docs/protocol.md)，这里只列形状：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 存活探测，**不鉴权**，只回实例 id 与协议版本 |
| GET | `/instance` | 实例文档：能力、工作目录、限制、模型 |
| POST | `/tasks` | 提交任务（`?waitSec=` 长轮询 / `mode:'async'` 立即返回） |
| GET | `/tasks/:id` | 快照 / 长轮询（`waitSec`、`after`） |
| GET | `/tasks/:id/events` | 增量进度（`after=<seq>`） |
| POST | `/tasks/:id/messages` | 续聊：追加要求，复用同一远端会话 |
| POST | `/tasks/:id/cancel` | 取消 |
| GET | `/tasks` | 最近任务（排障） |
| GET | `/channel` | **WebSocket 升级**：双向事件通道（普通 GET 返回 426） |
| POST | `/messages` | 通道不可用时的兜底：把协作消息放进对端收件箱 |

一次委派的时序：

```
A: cow_delegate
   ├─ POST /tasks {prompt, cwd, caller}          → 202 {taskId}
   ├─ GET  /tasks/:id?waitSec=120                → 长轮询
   │      B: agents.create → followup → whenIdle → flush
   └─ 200 {status:"succeeded", summary, needsInput, progressTail}
```

`needsInput` 是刻意设计的：远端 Agent 拿不到本机用户，遇到必须由人决定的事，就在摘要里写
「需要人工确认：…」，插件机械解析后放进返回值。本机 Agent 把问题转述给用户，再用
`cow_send` 把答复送回同一个远端会话。

---

## 7. 执行生命周期

```
            create
              │
        ┌─────▼─────┐  超出并发   ┌────────┐
        │  queued   │────────────▶│ 排队中  │
        └─────┬─────┘             └───┬────┘
              │ pump                  │ cancel
        ┌─────▼─────┐                 ▼
        │  running  │───────────▶ canceled
        └──┬────┬───┘
   whenIdle │    │ 抛错 / 超时 / 重启
        ┌───▼─┐  ▼
        │succeeded│ failed(interrupted)
        └───┬───┘
            │ cow_send（同一会话，必要时 agents.resume）
        ┌───▼─────┐
        │ running │ …
        └─────────┘
```

细节：

- **Agent 复用与释放**：续聊复用同一个 Agent；任务结束 10 分钟后释放（`dispose`），
  之后的续聊用 `agents.resume({ resumeSessionId })` 恢复，所以上下文不丢、内存不涨。
- **超时**：`maxTaskMinutes` 封顶单轮执行；超时 cancel 掉 Agent，任务落 `failed/timeout`。
- **取消**：`cancelReason` + `agent.cancel()`；排队中的任务直接出队。
- **重启恢复**：`tasks/*.json` 里非终态记录一律改判 `failed/interrupted`（见 §4）。
- **审计**：任务记录含调用方 label、工作目录、prompt、进度条目与最终摘要；`tokens.lastUsedAt`
  记录凭证最近使用时间。
- **完成通知**：任务进入终态时向发起方推送 `task.completed` / `task.failed` / `task.canceled`，
  payload 带摘要与 `needsInput`；发起方据此把通知注入原会话或落进收件箱。

---

## 8. 失败与降级矩阵

| 情况 | 表现 | 调用方看到 |
|---|---|---|
| 对端没启动 / 网络不通 | 连接失败 | `cow_peers` 标 `reachable:false`；`delegate` 报可读错误 |
| token 失效/被撤销 | 401 | 提示去对端重新签发登记串 |
| 工作目录越界 | 403 | 明确说「不在 allowedRoots 内」，附远端可用根目录 |
| 对端并发已满 | 429 | 提示稍后重试或换主机（`cow_match` 可给候选） |
| 远端模型不可用 | 任务 `failed/unavailable` | 摘要里带原因 |
| 远端需要人工审批但无人应答 | 该步骤被拒绝，任务继续 | 摘要里出现「需要人工确认」→ `needsInput` |
| 远端进程重启 | 任务 `failed/interrupted` | 明确失败，不重试（可能已产生副作用） |
| 本地工具超时 | 远端任务继续 | `status:"running"` + `taskId`，用 `cow_task` 继续 |
| 插件自身异常 | 只影响该次调用 | 宿主照常运行，错误写 stderr |

---

## 9. 与其它方案对比

| 方案 | 能解决「只能在特定主机跑」 | 缺点 |
|---|---|---|
| SSH + `dsh headless` | ✅ | 需要 shell；结果只有 stdout；远端会话不可见；无能力发现 |
| 每台机器装一个 MCP server | ✅ | 只暴露工具，不暴露「一个会干活的 Agent」；仍要人来选主机 |
| ACP / SDK JSON-RPC（stdio） | ✅ | 面向本地进程拉起，跨机要自己解决传输与认证 |
| 中心调度器（如 Hive 数字员工平台） | ✅ | 多一个常驻服务；审核/编排在中心，而不是「我的两台机器之间」 |
| 复用 Web GUI 的 `/api` | ⚠️ | 内部浏览器契约 + owner 全权，脆弱且过权 |
| **dsh-cow** | ✅ | 需要双方都装插件；通道无消息级加密，跨公网需隧道 |

---

## 10. 演进路线

- **v1.1（已实现）**：WebSocket 双工通道、任务完成通知与会话注入、`cow_notify` / `cow_inbox`、
  能力变更推送、通道状态可观测（`cow channel` / `cow_peers.channel`）。
- **v1.6（已实现）**：离线任务队列 + 子端 FIFO、流式进度（阶段/工具/助手文本，800ms 节流）、
  远端提问回传（`cow_ask` / `cow_answer`）、目录/批量文件同步（`cow_send_file` 传目录、`cow_pull_dir`）。
- **v1.7（已实现）**：帧级 AES-256-GCM 加密、`cow_doctor` 诊断包、任务产物清单与自动拉取、
  设置页任务队列/远端提问入口。
- **v1.9（已实现）**：审批由主 DSH 接管、侧边栏「Cow 活动」活动流面板。
- **v2.0（打磨）**：按 peer 的配额与预算、流式进度按需订阅、目录同步事务化。
- **v1.2（拓扑）**：对端 `hello` 反向登记（A 登记 B 的同时让 B 知道 A 的能力，便于 B 反向委派）、
  多跳委派深度控制、mTLS 选项、远端审批回传到发起方（`needsInput` 升级为交互式）。
- **v2（协作深化）**：跨实例会话引用（发起方直接引用远端 session 的片段做上下文）、
  内容寻址的产物交换、能力验证（对端提供可执行的自检脚本而不是只报 id）、
  按能力的自动路由（Agent 不再手动 `cow_match`）。

---

## 10.5 Haos 中心化（进行中）

组织模式正在搬进 Haos：拓扑由 Haos 集中配置，任务经 Haos 转发（`relay_tasks`），
深度/防环/直接下级由中心校验；`dsh-cow` 计划加 `transport: p2p | haos | auto`，
haos 模式下退化为"`GET /org` 读拓扑 + `POST /tasks` 派活 + 轮询 pending 执行"，
不再需要实例间互发 token。设计与 API 见 [haos/docs/org-relay.md](../haos/docs/org-relay.md)。

Haos 侧已完成：schema（orgs / relay_tasks / instances.org_*）、
`/api/plugin/v1/org` 与 `/api/plugin/v1/tasks*`、控制台 `/api/org*`、9 个单测与端到端脚本。
插件侧 transport 切换是下一步。

## 11. 已知局限（v1.6）

1. **单向登记**：A 登记 B 后，B 不知道 A 存在（除非 B 也登记 A）。不是 mesh。
2. **能力靠自述**：`detected` 只是命令能跑通，不代表版本/权限合适；跨组织互信前需要人工核对。
3. **帧级加密依赖双方升级**：新旧混用或 header-token 握手时回落明文；没有消息签名与前置身份认证，跨公网仍建议隧道。
4. **去重窗口有限且不持久**：接收方只在内存记最近 512 个 `msgId`，进程重启后窗口清空，极端重放可能重复投递。
5. **远端提问/审批不落盘**：`task.question` / `pendingQuestion` 只在内存，DSH 重启会丢失；子端等待中的 `cow_ask` 或审批会超时并 fail-closed。
10. **审批接管范围有限**：只接管子端“委派任务会话”的 `approval/request`；本机自己的会话审批仍由本机 answerer 处理，且审批结果依赖主端及时回答。
6. **离线队列有 TTL**：默认 2 小时，过期判失败，需要 `cow_retry`；队列不在通道层持久化，靠任务记录恢复。
7. **文件是逐文件传输**：目录同步没有整体事务（中途失败会留下部分文件），也没有带宽限制/断点续传整目录。
8. **子端并发固定为 1**：入站任务串行执行，队列上限默认 8；主端无法覆盖子端配置。
9. **设置页 Host API 只做同源防护**：能访问本机 web 端口的人就能调用 `/api/cow/*`，不要暴露公网。
