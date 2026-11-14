# dsh-cow 纯消息重构交接

## 目标（已达成）
彻底删除任务层，只保留消息：
- dispatch：主 DSH 发消息到子 DSH 会话输入队列，不等待、不轮询。
- complete：子 DSH 回合结束自动通知主 DSH 原会话。
- ask：子 DSH 向主 DSH 提问/审批。
- answer：主 DSH 回答。
- 每条消息带 workspace（id/name/path）、session（id/title）、approvalMode。

## 当前状态（2026-11-15，v1.26.0）
- 分支：`rewrite/message-only`。
- 已完成：
  - 最小 `src/index.js`：只装配 config/identity/peers/channel/files，
    接 `MessageBridge`/`MessageRouter`，注册消息与文件工具（无任务工具）。
  - 删除 `src/tasks.js`、`src/cow-tasks.js`、`src/remote-tasks.js`、`src/notify.js`、
    `src/inbox.js`、`src/prompt.js`、`src/upgrade.js`、`src/haos-transport.js`、`src/client.js`。
  - 删除任务 Admin 接口与设置页/侧边栏任务 UI；设置页只保留节点、连接、询问与活动。
  - 新增 `src/session-info.js`（workspace/session 信封 + 子端 cwd 白名单）。
  - 测试：125 条全通过（`npm test`），含“源码不存在 CowTasks/TaskManager/taskId 任务链”守护。
- 删除的旧测试：tasks/out-tasks/task-notify/notify/cascade/cow-ws/upgrade/prompt/haos-transport，
  新增 message-core/bridge/router/e2e/index/no-task-layer/session-info 测试。

## 隔离环境验证（/tmp/dsh-cow-dev + /tmp/dsh-cow-child）
- 环境：
  - 主：DSH_HOME=`/tmp/dsh-cow-dev`，web 端口随机，COW 60001。
  - 子：DSH_HOME=`/tmp/dsh-cow-child`，由 `scripts/join-child.mjs` 生成，连主 60001。
  - 主密码：`cow-dev-shared-password-2026`（仅本机临时环境）。
- dispatch → complete（session-manual-test-2/4）：
  - 主 Agent 调用 `cow_send` 后立即结束回合（turn/end completed）。
  - 子端创建 `session-cow-*` 会话并真实执行，回复 `COMPLETE-OK…` / `SMOKE-OK`。
  - 主会话随后出现 `user/message { source: { kind: "notification" } }`：
    `[COW 完成] 来自 子 DSH-Dev（回复消息 msg_…）`，并触发新一轮回复。
- ask → answer（session-manual-test-3）：
  - 子端 `cow_send(kind="ask")` → 主会话注入 `[COW 询问]`（带 questionId）。
  - 主端 `cow_send(replyTo=questionId, message="A")` → 子会话工具返回 A，
    子端继续并回 `ASK-RESULT-A`，complete 再注入主会话。
- 子会话工作目录：`workspace.path` 不在本机 allowedRoots 时落到根下同名目录；
  同名根目录直接复用，不再产生 `workspace/workspace` 嵌套。

## 关键文件
- `src/message-core.js`：信封、隔离键、complete/ask/answer 信封、`summarizeSession`。
- `src/message-bridge.js`：子端会话创建、preset/工作区、回合结束 complete、ask/answer。
- `src/message-router.js`：主端 complete/ask 注入原会话、answer 回子端、messageId 去重。
- `src/index.js`：装配与生命周期。
- `src/tools.js`：cow_send/cow_status/cow_peers/cow_doctor + 文件工具。

## 验证命令
```bash
cd /Volumes/wd2025/devel/aiworker/dsh-cow
npm test
node scripts/build-client.mjs

cd /tmp/dsh-cow-dev && env HOME=/Users/yechao DSH_HOME=/tmp/dsh-cow-dev dsh web --port 0 --no-open
```
