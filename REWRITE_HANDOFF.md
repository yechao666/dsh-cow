# dsh-cow 纯消息重构交接

## 目标（已达成）
彻底删除任务层，只保留消息：
- dispatch：主 DSH 发消息到子 DSH 会话输入队列，不等待、不轮询；模型收到返回后继续其它工作，complete 自动注入原会话。
- complete：子 DSH 回合结束自动通知主 DSH 原会话。
- ask：子 DSH 向主 DSH 提问/审批。
- answer：主 DSH 回答。
- 每条消息带 workspace（id/name/path）、session（id/title）、approvalMode。

## 当前状态（2026-11-18，v1.32.9）
- 分支：`main`；旧 `main` 保留为 `v1`，发布标签 `v1.32.9`。
- 测试：149 条全通过（`npm test`），含“源码不存在 CowTasks/TaskManager/taskId 任务链”守护。
- 子会话按 `peerId + workspace.id + session.id` 一一映射：每个主会话独立子会话；
  进程重启后用 `agents.resume` 恢复，并重新挂到对应工作区。
- complete 按 `messageId` 从会话事件里抽取该条消息对应的一轮；多条 dispatch 若被 DSH
  合并进同一轮，无法再按消息切分。
- 询问由被询问节点的 Agent 处理；设置页不提供人工回答/审批队列，状态面板只显示「询问中」计数。
- 局域网发现：UDP 广播 DISCOVER/OFFER，零依赖，手动选择候选，不自动连接。
- 默认工作区根目录改为 `~/.dsh/.dsh-cow-root`，不再默认占用 `/tmp`。
- 网络出口代理：子端本地 HTTP 代理 + 独立 `/cow/v1/net` 加密隧道；默认只放行公网 80/443，禁止私网；主端/子端各有开关。代理支持沿组织树自动向上转发（C→A→B）；COW 状态页「代理」tab 显示状态和最近 n 条日志；在线节点拓扑/详情显示「走代理」与「代理出口」TAG。
- 仅输入框首字符为 @ 时，原生 @ 菜单显示 COW 子 DSH 组；选中后插入 [TO: 名称] 引用前缀，作为普通消息内容发送。
- COW 状态页新增「配置」tab，内嵌同一套节点/主端/子端设置。
- COW 状态面板的「本机版本」是下载链接，点击下载当前插件包；侧边栏底部显示本机节点名称、主/子角色与连接数，点击打开 COW 状态；左侧导航不再重复放
  「COW状态」入口。右侧栏的 COW 状态 tab 仍保留为辅助视图。
- 文件收发已实测：单文件双向、目录递归、1.2MB 分块文件，两端 sha256 一致。
- 自动升级已实测：主端 `cow_upgrade` → 子端 1.31.0 自动下载 1.31.1 tgz、校验、移除/安装、热重载并回报 1.31.1。

## 历史重构内容（1.26）
- 最小 `src/index.js`：只装配 config/identity/peers/channel/files，
  接 `MessageBridge`/`MessageRouter`，注册消息与文件工具（无任务工具）。
- 删除 `src/tasks.js`、`src/cow-tasks.js`、`src/remote-tasks.js`、`src/notify.js`、
  `src/inbox.js`、`src/prompt.js`、`src/upgrade.js`、`src/haos-transport.js`、`src/client.js`。
- 删除任务 Admin 接口与设置页/侧边栏任务 UI。
- 新增 `src/session-info.js`（workspace/session 信封 + 子端 cwd 白名单）。
- 删除的旧测试：tasks/out-tasks/task-notify/notify/cascade/cow-ws/upgrade/prompt/haos-transport；
  新增 message-core/bridge/router/e2e/index/no-task-layer/session-info 测试。

## 隔离环境验证
- 环境：
  - 主：DSH_HOME=`/tmp/dsh-cow-dev`，web 端口随机，COW 60001。
  - 子：DSH_HOME=`/tmp/dsh-cow-child`，由 `scripts/join-child.mjs` 生成，连主 60001。
  - 主密码：临时开发密码，不写入文档；需要时在设置页重置。
- dispatch → complete：
  - 主 Agent 调用 `cow_send` 后立即结束回合（turn/end completed）；工具结果带 `async: true` 并提示不要等待/轮询。
  - 子端按工作区创建/复用 `session-cow-*` 会话并真实执行，回复后 `msg.complete` 回到主端。
  - 主会话出现 `user/message { source: { kind: "notification" } }`：
    `[COW 完成] peerId=cow_… peerName="子 DSH-Dev" replyTo=msg_…`，正文用消息级边界符包裹，并触发新一轮回复。
- ask → answer：
  - 子端 `cow_send(kind="ask")` → 主会话注入 `[COW 询问]`（带 questionId）。
  - 主端 `cow_send(replyTo=questionId, message="A")` → 子会话工具返回 A，
    子端继续并回 `ASK-RESULT-A`，complete 再注入主会话。
- 子会话工作目录：`workspace.path` 不在本机 allowedRoots 时落到根下同名目录；
  同名根目录直接复用，不再产生 `workspace/workspace` 嵌套。
- 文件：主→子单文件、子→主单文件、子→主目录、主→子目录（含 1.2MB 分块文件）全部成功。

## 关键文件
- `src/message-core.js`：信封、复用键、complete/ask/answer 信封、`summarizeSession`/`summarizeTurn`。
- `src/message-bridge.js`：子端按工作区复用/恢复会话、preset/工作区、回合结束 complete、ask/answer。
- `src/message-router.js`：主端 complete/ask 注入原会话、answer 回子端、messageId 去重。
- `src/index.js`：装配与生命周期。
- `src/package-service.js` / `src/tarball.js`：插件包生成、公开下载。
- `src/auto-upgrade.js`：子端接收 `msg.upgrade`，下载/校验并调用 `pluginManager` 升级。
- `src/tools.js`：cow_send/cow_status/cow_peers/cow_doctor + 文件工具。
- `client-src/index.js`：侧边栏底部节点标识、COW 状态面板与设置页。

## 验证命令
```bash
cd /Volumes/wd2025/devel/aiworker/dsh-cow
npm test
node scripts/build-client.mjs

cd /tmp/dsh-cow-dev && env HOME=/Users/yechao DSH_HOME=/tmp/dsh-cow-dev dsh web --port 0 --no-open
```
