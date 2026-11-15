# 改成 A2A：可行性评估与迁移方案

> 评审对象：dsh-cow v1.31.10（纯消息架构）
> 日期：2026-11-15
> 结论：**可行，但建议做「A2A 适配层 + 双栈」，不建议把 dsh-cow 的内部协议整体替换成 A2A。**
> 如果你的目标只是自家 DSH 机群互连，A2A 的收益有限；如果目标是接入外部 Agent 生态（LangGraph/CrewAI/ADK/第三方 Agent），A2A 适配层值得做。

---

## 1. 一句话回答

- **A2A 能补齐什么**：标准发现（Agent Card）、任务状态机、取消/订阅/流式、推送通知、认证声明、跨框架互操作。
- **A2A 不能直接给你什么**：DSH 会话/工作区映射、子端主动向父端提问的对称通道、离线发件箱、NAT 穿透、带断点续传的文件通道、帧级 E2E 加密、DSH UI 注入。
- **所以**：把 A2A 当作**对外合同**，把现有 WS 消息核心当作**对内执行总线**。两者用 adapter 连接，而不是二选一。

---

## 2. A2A 的关键事实（v1.0）

A2A 是 Linux Foundation 下的 Agent2Agent 互操作标准，当前版本 1.0，官方 SDK 覆盖 Python/JS/Java/Go/.NET/Rust，支持 JSON-RPC 2.0 over HTTP/SSE、gRPC、HTTP/REST 三种绑定。([规范索引](https://a2a-protocol.org/latest/specification/)、[快速参考](https://a2a-protocol.org/llms-reference.txt))

核心对象：

| 对象 | 作用 |
|---|---|
| **Agent Card** | `/.well-known/agent-card.json`，描述身份、接口、能力、技能、认证方式 |
| **Task** | 有状态工作单元：`id`、`context_id`、`status`、`artifacts`、`history` |
| **TaskState** | `SUBMITTED / WORKING / COMPLETED / FAILED / CANCELED / REJECTED / INPUT_REQUIRED / AUTH_REQUIRED` |
| **Message / Part** | 多轮消息，Part 支持 text/raw/url/data |
| **Artifact** | 任务产物（文件、结构化结果） |

方法：

| 方法 | 用途 |
|---|---|
| `SendMessage` | 发起/继续任务 |
| `SendStreamingMessage` | SSE 流式 |
| `GetTask` / `ListTasks` | 查询状态 |
| `CancelTask` | 取消 |
| `SubscribeToTask` | 订阅已有任务更新 |
| `CreateTaskPushNotificationConfig` | Webhook 推送（离线场景） |

任务生命周期、流式/异步和推送的官方说明见 [Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)、[Streaming & Async](https://a2a-protocol.org/latest/topics/streaming-and-async/)、[Enterprise Features](https://a2a-protocol.org/latest/topics/enterprise-ready/)。

---

## 3. 为什么「全量替换」不合适

### 3.1 拓扑差异

dsh-cow 是**对称的长连接 mesh**：子 DSH 主动拨主 DSH，双方都能随时发 `dispatch/complete/ask/answer`，离线时进发件箱。

A2A 是**客户端-服务端 HTTP**：客户端调用 A2A Server 的 `SendMessage`；服务端通过 SSE 流、`GetTask` 轮询或 Webhook 推送回传状态。要让「子端主动提问/完成」成立，需要：

- 子端同时是 A2A Client，去调用父端的 A2A Server；或
- 父端注册 Webhook，子端 POST 回调；或
- 父端保持 `SubscribeToTask` 的 SSE 长连接。

这三种都能做，但都要求**双方都可被对方访问**，或额外引入 relay。当前 dsh-cow 的「子拨父、父不用暴露给子」在 NAT/内网更简单。

### 3.2 任务状态会回来

A2A 的 `GetTask`、`ListTasks`、`CancelTask`、`SubscribeToTask` 都建立在**可查询的任务状态**上。要支持这些方法，至少需要：

- taskId ↔ DSH 会话/消息的映射；
- 任务状态持久化（进程重启后 `GetTask` 仍可用）；
- 取消/订阅的状态机。

这不是旧 CowTasks 那种「认领 + FIFO + 进度表」，但确实是**协议级任务状态**。如果完全不存，A2A 客户端只能拿到「一次性响应」，失去标准的大部分价值。

### 3.3 文件与加密

- A2A 的 Artifact 支持 `raw`（内联 base64）或 `url`；标准不定义 256 KiB 分块、断点续传、sha256 校验。dsh-cow 现有文件通道需要改成 Artifact Service/扩展，或保留独立文件通道。
- A2A 要求生产环境 HTTPS/TLS，认证用 Agent Card 声明的 API Key/OAuth2/OIDC/mTLS；dsh-cow 现在是共用密码 + 应用层 AES-GCM。换成 A2A 意味着安全模型也要换（这是好事，但工作量和迁移成本要算）。

### 3.4 A2A 不解决 DSH 内部问题

- 子会话按 `peerId + workspace` 复用、`agents.resume`、`whenIdle`、`ask_user_question` 注入，这些仍是 DSH 侧实现细节；
- 远端消息如何注入原会话、如何触发「这条通知触发了本轮回复」，A2A 不管；
- COW 状态面板、审批可见性、活动流，仍要自己做。

---

## 4. 映射表：dsh-cow ↔ A2A

| dsh-cow | A2A | 备注 |
|---|---|---|
| `peerId` | Agent Card 身份 / `AgentInterface` | Agent Card 需暴露 peerId、版本、能力、认证 |
| `peerId + workspace.id` | `contextId` | 一个 A2A context 可映射到 DSH 工作区；主端 `session.id` 作为扩展 metadata |
| `msg.dispatch` | `SendMessage`（新 Task） | `messageId` 可作为 A2A messageId；`taskId` 可由 dispatch messageId 派生 |
| `msg.complete` | `TaskStatusUpdateEvent` / `Task.state=COMPLETED` + Artifacts | 需要 `FAILED/CANCELED` 与 `error` |
| `msg.ask` | `Task.state=INPUT_REQUIRED` + Message | 需要客户端继续 `SendMessage` |
| `msg.answer` | `SendMessage`（继续 Task） | 需要 `taskId/contextId` 关联 |
| 无 | `CancelTask` | 新增；子端 `agent.cancel()` |
| 无 | `SubscribeToTask` / push | 替代当前 WS complete 推送 |
| 无 | `GetTask` / `ListTasks` | 需要任务状态存储 |
| 文件通道 | Artifact（url/raw）或扩展 | 大文件建议独立 Artifact Service |
| 共享密码 | Agent Card security schemes | 长期应换 API Key/OAuth2/mTLS |
| 帧级 AES-GCM | HTTPS/TLS + 标准认证 | 应用层 E2E 可作为扩展保留 |
| `approvalMode` | metadata / extension | A2A 没有直接等价字段 |

---

## 5. 三种方案与决策矩阵

### 方案 A：只借语义，不换线协议（推荐给「自家机群」）

- 保留 WS + 自定义消息；
- 借 A2A 的 **Agent Card、TaskState、Cancel/Progress、认证模型** 作为设计参考；
- 不追求与外部 A2A 客户端互通；
- 成本：低；收益：可靠性与可观测性提升，互操作仍为零。

**适合**：只连自家 DSH、可信内网、短期不想承担协议迁移。

### 方案 B：A2A 适配层 + 双栈（推荐给「要接外部 Agent」）

```text
DSH Agent / Session
        ↕
cow message core（dispatch/complete/ask/answer）
        ↕
A2A adapter（Agent Card / SendMessage / GetTask / CancelTask / Subscribe / push）
        ↕
HTTP/SSE/gRPC（对外）         WS mesh（对内，保留离线/双向 ask/文件）
```

- 对外：标准 A2A Server/Client，任何 A2A 客户端（LangGraph/CrewAI/ADK/第三方）可调用；
- 对内：保留 WS 的低延迟、双向 ask、离线发件箱、文件断点续传；
- 任务状态在 adapter 层持久化，不污染 DSH 会话模型；
- 成本：中；收益：互操作 + 保留现有优势。

**适合**：希望 DSH 作为「可被外部调用的 Agent」，同时保留自家机群协同。

### 方案 C：全量替换为 A2A（不推荐作为第一步）

- 删除自定义 WS 消息、发件箱、文件通道，全部走 A2A HTTP；
- 子端必须暴露 A2A Server，父端/子端都要处理可达性；
- 任务状态、取消、订阅、推送全部按 A2A 重写；
- 成本：高；风险：NAT/离线/双向 ask/文件能力下降，DSH 升级耦合仍在。

**适合**：组织级 Agent 网关、跨厂商生态、已有 API Gateway/身份体系；不适合当前这种「内网小机群 + 本机文件交换」的场景。

### 决策矩阵

| 目标 | 选 A | 选 B | 选 C |
|---|---:|---:|---:|
| 只连自家 DSH，可信内网 | ✅ | 可选 | ❌ |
| 要接外部 A2A Agent/框架 | ⚠️ 不够 | ✅ | ✅ |
| 跨组织/多租户/企业网关 | ❌ | ✅ | ✅ |
| 保留离线、双向 ask、文件断点续传 | ✅ | ✅ | ⚠️ 需重做 |
| 最小改动、最快上线 | ✅ | ⚠️ | ❌ |

**建议：先做 A 的语义升级（协议 v2），再做 B 的 A2A adapter；不要直接做 C。**

---

## 6. 迁移路线（方案 B）

### Phase 0：协议 v2（2–3 周）

先补齐与 A2A 对齐的语义，不依赖 A2A SDK：

- `status`：`accepted/running/input-required/completed/failed/canceled`
- `error{code,message,retryable}`
- `deadline`、`msg.cancel`、`msg.progress`
- 消息级 `ack`（delivered/processed）
- 持久化去重与发件箱 TTL

这些即使不做 A2A 也应该做；它们是 adapter 的地基。

### Phase 1：Agent Card + 入站 A2A Server（3–4 周）

- `/.well-known/agent-card.json`：peerId、名称、版本、skills、capabilities、security schemes；
- `SendMessage`：映射到 `msg.dispatch`，创建 taskId；
- `GetTask` / `CancelTask`：查询/取消 DSH 会话状态；
- 最小任务存储：taskId、contextId、状态、artifacts、origin messageId；
- 用官方 SDK 或 A2A CLI 做 conformance 测试。

### Phase 2：出站 A2A Client（2–3 周）

- 主 DSH 可以把消息派给外部 A2A Agent；
- 支持 JSON-RPC/HTTP；可选 gRPC；
- 把结果注入原会话（与现有 complete 注入一致）。

### Phase 3：流式/推送/文件（3–5 周）

- `SendStreamingMessage` → progress 注入/COW 面板；
- `SubscribeToTask` / Webhook push → 替代 complete 推送；
- Artifact Service：大文件 URL + sha256 + 断点续传（可作为 A2A 扩展）；
- 多租户/配额/审计。

### Phase 4：安全与治理（2–4 周）

- HTTPS/TLS；Agent Card 声明 API Key/OAuth2/OIDC/mTLS；
- 每 peer 身份替代共享密码；
- 速率限制、配额、审计、trace。

> 粗略估算：一名熟悉 DSH 和后端的工程师，方案 B 的生产可用版本约 **2–4 个月**（不含组织级网关/多租户）。方案 C 约 **4–6 个月**，且要接受能力退化或额外自研。

---

## 7. 关键风险

| 风险 | 说明 | 缓解 |
|---|---|---|
| A2A 规范演进 | v1.0 之后仍会有扩展/绑定变化 | 锁定版本、conformance 测试、adapter 隔离 |
| 双向可达性 | 子端在 NAT 后，父端/子端都要暴露 HTTP | 保留 WS 拨号；A2A 走 relay/网关；或只用 push |
| 任务状态回潮 | GetTask/Cancel/Subscribe 需要持久化 | 只存协议级最小状态，不恢复旧任务队列 |
| 双栈复杂度 | 两套身份、两套去重、两套路由 | 统一 messageId/traceId；adapter 做转换 |
| 文件能力 | A2A 核心不分块/续传 | Artifact Service + 扩展；保留内部文件通道 |
| 安全模型 | 共享密码不满足 A2A 企业要求 | 先 API Key/mTLS，再 OAuth2/OIDC |
| DSH 耦合 | agents/session API 变化 | capability negotiation + 版本锁 |

---

## 8. 验收标准（如果做方案 B）

- [ ] 官方 A2A CLI/SDK 可以发现 Agent Card，并向 DSH 子节点 `SendMessage` 得到一个 `COMPLETED` Task + Artifact。
- [ ] 外部 A2A Client 可以 `GetTask` 查询状态；`CancelTask` 能停止对应 DSH 会话回合。
- [ ] `INPUT_REQUIRED` 能映射到 DSH 的 `ask_user_question`，用户回答后 Task 继续到 `COMPLETED`。
- [ ] 主 DSH 可以作为 A2A Client 调用一个 LangGraph/CrewAI/ADK 示例 Agent，并把结果注入原会话。
- [ ] 子节点重启后 `GetTask` 仍能返回正确状态（持久化）。
- [ ] 内部 WS 的 dispatch/complete/ask/answer 不回归；离线发件箱、文件断点续传仍可用。
- [ ] 双栈下同一 messageId 不会重复执行（持久化去重）。

---

## 9. 最终建议

1. **不要把「成熟」等同于「适合」**：A2A 成熟在互操作与任务语义，不在「内网长连接 + 双向提问 + 文件断点续传」这些 dsh-cow 的强项。
2. **先做协议 v2 语义升级**：status/error/cancel/progress/ack/持久去重。无论是否上 A2A，这些都是必须的。
3. **如果目标是外部生态**：做 A2A adapter + 双栈；这是性价比最高的路径。
4. **如果目标只是自家 DSH**：不必换 A2A 线协议；借 Agent Card/TaskState/认证模型即可。
5. **如果必须全量 A2A**：先接受「双方可被访问 + 任务状态持久化 + 文件 Artifact 服务 + HTTPS/身份体系」这四个前提，再谈替换；否则会在 NAT、离线、双向 ask 上付出比预期更高的代价。

---

## 10. 参考

- A2A 规范与概念：[Specification](https://a2a-protocol.org/latest/specification/)、[Core Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)、[Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)、[Agent Discovery](https://a2a-protocol.org/latest/topics/agent-discovery/)、[Streaming & Async](https://a2a-protocol.org/latest/topics/streaming-and-async/)、[Enterprise Features](https://a2a-protocol.org/latest/topics/enterprise-ready/)、[Quick Reference](https://a2a-protocol.org/llms-reference.txt)
- A2A 代码与 SDK：[GitHub](https://github.com/a2aproject/A2A)
- A2A 捐赠 Linux Foundation：[Google Cloud blog](https://developers.googleblog.com/en/google-cloud-donates-a2a-to-linux-foundation/)
- 对比协议：[ACP (IBM/BeeAI)](https://agentcommunicationprotocol.dev/core-concepts/architecture.md)、[Agent Client Protocol](https://agentclientprotocol.com/get-started/architecture.md)、[AG-UI](https://docs.ag-ui.com/concepts/events)、[MCP](https://modelcontextprotocol.io/docs/learn/architecture)
- 设计评审主文档：[docs/design-review-2026-11.md](design-review-2026-11.md)
