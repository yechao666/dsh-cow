# dsh-cow 设计文档（纯消息架构）

> 本文描述 1.26 起的纯消息架构。1.25 及以前的任务层（CowTasks / TaskManager /
> taskId 队列）已彻底删除。

## 1. 问题拆解

多台 DSH 之间要协同，只需要三件事：

1. **把一句话交给另一台 DSH 的 Agent**，并在它做完后拿回结论；
2. **执行中需要决策时能问发起方**，且回答回到同一个会话；
3. **传文件**。

任务 ID、认领、排队、进度流、离线任务队列都是围绕「远程过程调用」建立的中间层；
DSH 自己的 Agent 输入队列已经能做排队，会话日志已经能做审计。把消息直接放进会话，
就不需要再维护一套任务状态机。

## 2. 总体架构

```text
主 DSH                                     子 DSH
┌──────────────────────────┐   WebSocket  ┌──────────────────────────┐
│ Agent ──cow_send─────────┼──msg.dispatch──▶ 输入队列 → 子会话 Agent │
│   ▲                      │              │        │                  │
│   │ [COW 完成] 注入原会话 │◀─msg.complete─┼────────┘ 回合结束        │
│   │ [COW 询问] 注入原会话 │◀──msg.ask─────┼── cow_send(kind=ask)    │
│   └──cow_send(replyTo)───┼──msg.answer──▶ 兑现等待 / 唤醒子会话     │
└──────────────────────────┘              └──────────────────────────┘
```

- `src/message-core.js`：消息信封、隔离键、complete/ask/answer 信封、会话摘要。
- `src/message-bridge.js`：子端。dispatch 落进子会话，回合结束自动 complete；
  ask 发消息并等待，answer 兑现或唤醒。
- `src/message-router.js`：主端。complete/ask 注入原会话，answer 回子端。
- `src/index.js`：只装配 config / identity / peers / channel / files 与上面两个消息组件。

## 3. 关键设计决策

### 3.1 dispatch 立即返回，不轮询

`cow_send` 只把 `msg.dispatch` 交给通道就返回 `{ messageId, status: "sent" }`。
对端离线时消息进通道发件箱，重连后按 ack 续传。排队由 DSH Agent 输入队列负责，
dsh-cow 不维护第二套队列。

### 3.2 完成以通知注入原会话

子端在 `agent.whenIdle()`（并等待子代理收敛、flush 会话）之后，从 Session 事件流里
提取本轮的助手文本，发 `msg.complete`。主端按信封里的 `session.id` 注入原会话：

```js
agent.followup({ content: [...], source: { kind: 'notification' } })
```

非 `user` 来源的输入会被 DSH 标记为唤醒型 context message，界面显示
“这条通知触发了本轮回复。”，主 DSH 因此能用同一轮对话继续处理结论。

### 3.3 隔离键 = peer + workspace.id + session.id

子端为每个主会话维护一个子会话：

```text
key       = peer :: workspace.id :: session.id
sessionId = "session-cow-" + sha256(key).slice(0, 16)
```

不同工作区、不同主会话互不串线；同一主会话多次 dispatch 复用同一子会话，
因此上下文连续。每条消息都带 workspace（id/name/path）与 session（id/title），
子端不需要猜自己在替谁干活。

### 3.4 ask / answer 不引入任务 ID

提问复用原 dispatch 信封的 workspace/session，只多一个 `questionId`。主端把问题注入原会话，
回答用 `msg.answer` 回到同一子节点。子端：

- 有工具/审批正在等待该 questionId → 直接兑现 Promise，本轮继续；
- 没有等待者 → 作为 `[COW 回答]` 输入唤醒同一子会话。

审批接管用同一机制：`approval/request` → `msg.ask` → `allowed-once` / `rejected`；
超时或上级不可达返回 `unavailable`（fail-closed）。

### 3.5 工作目录白名单

子端只允许在 `allowedRoots` 内创建会话。主端 `workspace.path` 在本机可用（词法 + realpath
都在根内）就用它，否则落到第一个根目录下的 `workspace.name` 同名目录。根为空时拒绝执行。

### 3.6 至少一次投递 + 去重

通道按 peer 保留最近 300 条事件，收到 ack 后丢弃；接收方按 msgId 去重 512 条。
消息桥与主端路由各有一层 messageId 去重，重复送达不会重复执行/注入。

### 3.7 帧级加密

双方握手时用共用密码 + 每次连接 nonce 派生 AES-256-GCM 会话密钥，业务帧整体加密，
握手帧保持明文便于排障。密钥不落盘，重连即轮换。

## 4. 威胁模型

- 持有连接密码的一方等于被授权在本机跑 Agent；`allowedRoots` 是最后一道边界。
- 消息正文来自另一台 DSH 的 Agent，属于**不可信数据**；不把远端文本当系统指令执行。
- 密码、token 不写入日志、诊断包或设置覆盖层；诊断包只收集状态与计数。
- 审批 fail-closed：上级不可达/超时一律 `unavailable`，不放行。

## 5. 数据模型

`$DSH_HOME/cow/` 下只有状态文件，没有任务记录：

| 文件 | 内容 |
|---|---|
| `instance.json` | 实例身份、角色、上级地址（0600） |
| `peers.json` | 已登记节点与文件策略（0600） |
| `settings.json` | 设置页覆盖层（0600） |
| `channel-state.json` / `channel-outbox.json` | 通道 ack 水位与发件箱 |
| `http.token` / `http.json` | 本机管理接口令牌与端点 |

子会话本身是正常的 DSH 会话，落在会话存储里，可在界面中查看、审计。

## 6. 失败与降级

| 场景 | 行为 |
|---|---|
| 子端离线时 dispatch | 进发件箱，重连后补发；工具已返回“已发送/排队” |
| 原会话已关闭 | 注入失败，写日志与活动流，不抛给远端 |
| 子端回合报错 | complete 文本带“子 DSH 执行失败：…”，主端仍收到通知 |
| ask 超时 | 子端返回 `{ok:false,error:"等待上级回答超时"}` |
| 上级不可达 | ask 直接失败；审批返回 `unavailable` |
| 主端路径在本机不可用 | 落到 allowedRoots 下的同名目录 |

## 7. 与任务架构的对比

| 维度 | 旧任务层 | 纯消息 |
|---|---|---|
| 状态 | 任务表 + 状态机 + 持久化 | 无；会话日志即审计 |
| 排队 | 自建 FIFO + 并发上限 | DSH Agent 输入队列 |
| 完成 | task.result 轮询/事件映射 | 回合结束自动 complete 注入 |
| 提问 | task.question 绑定 taskId | msg.ask + questionId，复用会话信封 |
| 代码量 | tasks.js + cow-tasks.js + notify + remote-tasks | message-core/bridge/router |

## 8. 已知局限

- 待回答询问只在内存，进程重启丢失（子端 ask 会超时失败）。
- 同一子会话连续 dispatch 由输入队列串行处理；complete 的摘要覆盖“自 dispatch 起的所有轮次”，
  不会按消息精确切分（每条消息仍各带 replyTo）。
- 通道去重窗口是内存 512 条；重启后窗口清空，依赖 Agent 输入队列的幂等性有限。
