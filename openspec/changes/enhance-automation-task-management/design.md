## Context

创作者定时任务页已经通过 TanStack Query 读取任务，并通过 canonical
`automation_update`、生命周期和删除 API 执行变更。服务端更新逻辑目前只接受名称、提示词和调度，实体中已有其余执行策略字段；删除使用取消状态而非物理删除。详见 proposal.md 和现有
`multichannel-automations` 规格。

## Goals / Non-Goals

**Goals:**

- 让删除成功后的 UI 在 mutation 完成时立即移除任务。
- 提供可复用的编辑对话框，编辑所有用户可安全修改的任务定义字段。
- 保持服务端归属、校验和乐观并发保护为最终权威。

**Non-Goals:**

- 不允许通过工作区修改 agent、channel、account、conversation 或 delivery target。
- 不重构调度器或改变运行/投递审计。

## Decisions

1. **编辑入口放在创作者任务卡片内。** 每张非终态任务显示编辑按钮；对话框按 `at`、`every`、`cron`
   切换调度字段，并使用受控表单在提交前做基础校验。这样保留现有页面视觉和操作上下文，同时避免暴露渠道凭据。
2. **服务层扩展更新输入而非新增持久化路径。** `AutomationService.updateJob` 继续复用
   `parseSchedule`、`nextOccurrence` 和 `expectedUpdatedAt`，新增策略字段的范围校验；MCP 与 web
   API 共享同一边界。
3. **删除采用 query cache 的乐观移除并在成功后失效查询。** mutation 的 `onSuccess` 使用
   `setQueryData` 过滤返回任务 ID，再 invalidate 触发服务端校准。失败时不修改列表，保留错误提示。
4. **更新时间字段作为并发令牌。** 编辑提交携带打开时的
   `updatedAt`；服务端检测冲突并要求刷新，避免覆盖渠道或其他窗口的更新。

## Risks / Trade-offs

- [Risk] 浏览器中的任务在编辑对话框打开期间被其他入口修改 → 使用 `expectedUpdatedAt`
  返回冲突，并提示用户刷新。
- [Risk]
  用户填写了与调度类型不匹配的旧字段 → 提交时仅发送当前类型所需的规范化 schedule，由服务端再次解析。
- [Risk] 乐观移除与后台 refetch 短暂竞态 → 成功后立即失效查询，服务端结果最终收敛。
