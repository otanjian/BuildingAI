## Context

现有 API 已有 `UserMemory` 实体、`MemoryService`、`GET/DELETE /ai-memories` 接口，以及设置页中的记忆展示组件。当前删除服务的最终更新仅按 ID 执行，编辑和清空能力缺失；设置导航也没有独立的长期记忆入口。设计复用现有模块、TypeORM、React Query 和共享 UI，不引入新的存储依赖。

## Goals / Non-Goals

**Goals:**

- 建立独立且可发现的“我的长期记忆”管理入口。
- 提供安全的个人记忆 CRUD 和清空操作。
- 让手工维护后的记忆立即影响后续聊天上下文。
- 保持现有自动抽取、软删除和数据表兼容。

**Non-Goals:**

- 不在本变更中实现 Agent 专属记忆的管理 UI。
- 不改变记忆抽取 Prompt、模型路由、计费和上下文压缩策略。
- 不增加向量数据库或跨用户共享能力。

## Decisions

### 1. 复用 `ai_user_memory` 表

继续使用 `UserMemory` 的 `content/category/isActive/source/createdAt/updatedAt` 字段。手工新增和编辑沿用同一表，使自动抽取记忆与用户手工记忆在聊天侧拥有一致语义。API 层限制分类为 `preference | personal_info | habit | instruction`，并保留未知历史值的读取兼容。

### 2. API 以认证用户为唯一所有权来源

新增：

```text
GET    /ai-memories
POST   /ai-memories
PATCH  /ai-memories/:id
DELETE /ai-memories/:id
DELETE /ai-memories/all
```

请求 DTO 只接收 `content` 和 `category`；服务层所有查询都同时带 `id + userId + isActive`。删除和清空使用条件更新，避免先查询后按 ID 更新导致越权窗口。保留现有 GET/DELETE 路径兼容客户端。

### 3. 前端作为设置中的独立页面

在 `SETTINGS_NAV` 增加 `longTermMemory` 页面，使用 `Brain`/`BookOpen` 类图标，放在 AI 设置组。页面复用现有 `SettingItemGroup`、Dialog、Textarea、Select、AlertDialog 和 Toast。每条记忆提供编辑和删除操作，顶部提供“新增记忆”和“清空全部”；编辑使用同一表单 Dialog，减少重复交互。

### 4. React Query 服务扩展

在现有 `user-memory` web service 中新增 query/mutation hooks，并在成功后失效 `['ai-memories']`。编辑和新增采用保守刷新策略，避免并发修改覆盖；提交按钮在 mutation pending 时禁用。

### 5. 自动抽取与手工编辑冲突处理

本次不引入复杂事实图谱。编辑后的记录保持同一 ID 和 `updatedAt`；自动抽取继续使用现有规范化全文去重。后续如需“同一偏好覆盖旧偏好”，另立 OpenSpec 变更。

### 6. 验证策略

后端为 service/controller 增加用户隔离、校验、CRUD 和清空测试；前端运行 lint/typecheck，并通过手工流程验证菜单、空状态、编辑、删除、清空和窄屏布局。

## Risks / Trade-offs

- [Risk] 自动抽取可能再次生成与手工编辑内容相似的记录 → [Mitigation] 复用规范化去重，并在本变更中覆盖重复提交测试。
- [Risk] 清空操作不可逆体验 → [Mitigation] 使用二次确认，实际采用软删除，保留后续恢复/审计空间。
- [Risk] 记忆内容本身可能包含敏感信息 → [Mitigation] UI 提供隐私提示；本次不新增自动敏感识别，沿用现有抽取策略，敏感信息治理另立变更。
- [Risk] 旧客户端只支持 DELETE 单条接口 → [Mitigation] 保持旧接口兼容，同时修复其所有权条件。

## Migration Plan

1. 发布后端 DTO、服务和接口，不修改既有表结构。
2. 发布前端菜单、页面和文案；旧客户端继续使用原列表/删除接口。
3. 验证认证用户隔离和回归测试。
4. 如需回滚，回退前端入口即可；新增 API 保持向后兼容，不需要数据库回滚。
