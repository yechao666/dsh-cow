# dsh-cow 纯消息重构交接

## 目标
彻底删除任务层，只保留消息：
- dispatch：主 DSH 发消息到子 DSH 会话输入队列，不等待、不轮询。
- complete：子 DSH 回合结束自动通知主 DSH 原会话。
- ask：子 DSH 向主 DSH 提问/审批。
- answer：主 DSH 回答。
- 每条消息带 workspace（id/name/path）、session（id/title）、approvalMode。

## 当前状态（2026-11-15）
- 分支：`rewrite/message-only`（已提交新核心）。
- 已实现：
  - `src/message-core.js`：消息信封、peer+workspace+session 隔离键。
  - `src/message-bridge.js`：dispatch 进入 DSH 会话，回合结束自动 complete。
  - `src/message-router.js`：主端 complete/ask 注入、answer 回子端。
  - 新核心测试 8 条通过。
- 未实现：
  - 实际入口 `src/index.js` 仍使用 CowTasks/TaskManager。
  - 旧任务文件、旧工具定义、任务 UI/Admin 未删除。
- 运行版本：1.25.0（旧架构），不要当作已完成。

## 隔离开发环境
- DSH_HOME：`/tmp/dsh-cow-dev`
- Web：`http://127.0.0.1:65330/?token=WqAbzgdldUuGHpQmcKbgXGwHoUQXqthz9XcjwkOE0B4`
- COW 端口：60001
- 工作区：`/tmp/dsh-cow-dev/workspace`
- 日志：`/tmp/dsh-cow-dev.log`
- 插件以软链方式指向仓库；改 host 源码后重启实例即可。
- 启动命令：
  `cd /tmp/dsh-cow-dev && env HOME=/Users/yechao DSH_HOME=/tmp/dsh-cow-dev dsh web --port 0 --no-open`

## 下一步（按顺序）
1. 新建最小 `src/index.js`：只初始化 config/identity/peers/channel/files，接 MessageBridge/MessageRouter，注册最小工具（cow_send、cow_peers、cow_status）。
2. 在隔离环境跑通 dispatch → complete 注入原会话；ask → answer → 子会话继续。
3. 删除 `src/cow-tasks.js`、`src/tasks.js`、旧工具定义、任务 Admin/UI。
4. 用新消息测试替换旧 171 条任务测试。
5. 全量测试通过后再标记完成。

## 验收
- 主 DSH 派完立即结束回合，无轮询。
- 子 DSH 完成以通知注入原会话，显示“这条通知触发了本轮回复。”
- ask/answer 在同一 workspace+session 映射内往返。
- 代码中不存在 CowTasks/TaskManager/taskId 任务链。
