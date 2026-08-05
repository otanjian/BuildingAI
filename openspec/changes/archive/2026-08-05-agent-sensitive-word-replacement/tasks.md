## 1. 类型与数据模型

- [x] 1.1 在 `packages/@buildingai/types/src/ai/agent-config.interface.ts` 新增 `SensitiveWordConfig` 接口（enabled / words / replacement / applyToReasoning）
- [x] 1.2 在 `packages/@buildingai/types/src/ai/agent-config.interface.ts` 的 `AgentCore` / `UpdateAgentConfigParams` 中加入 `sensitiveWordConfig`
- [x] 1.3 在 `packages/@buildingai/db/src/entities/ai-agent.entity.ts` 新增 `sensitiveWordConfig` JSON 列（nullable，注释：敏感词过滤配置）
- [x] 1.4 在 `packages/api/src/modules/ai/agents/dto/web/agent/` 的 create/update DTO 中加入 `sensitiveWordConfig` 校验字段（可选、嵌套校验）

## 2. 核心过滤引擎

- [x] 2.1 实现 `packages/api/src/modules/ai/agents/utils/sensitive-word-filter.ts`：AC 自动机（编译、匹配、最长匹配优先、大小写不敏感）
- [x] 2.2 实现同文件批量接口 `filterText(input: string): string`
- [x] 2.3 实现同文件流式接口 `createStream(): { push(delta): string[]; flush(): string[] }`，含 holdback 缓冲（长度 = maxWordLen-1）与 UTF-16 代理对边界回退
- [x] 2.4 引擎支持 `replacement` 与 `applyToReasoning` 参数；未启用/空词表时零开销透传
- [x] 2.5 编写 `sensitive-word-filter.spec.ts` 单测：跨块词、大小写、重叠最长匹配、代理对边界、flush 后流式结果 === 批量结果

## 3. 薄壳适配器

- [x] 3.1 实现 `SensitiveWordWriter`（包装 `writer.write`，对 text-delta / reasoning-delta 走流式过滤，其余类型透传；未启用时原样透传）
- [x] 3.2 实现 `SensitiveWordTransformStream`（TransformStream 版本，供 direct 链路 merge 前拦截）

## 4. 第三方 Provider 接线（opencode / coze / dify）

- [x] 4.1 opencode：`opencode-chat.provider.ts` 的 `writeChunks` 改用 `SensitiveWordWriter`；`appendErrorText` 错误文本过过滤
- [x] 4.2 opencode：拼 `responseParts` 前对 `partRouter.fullText` 与持久化 reasoning parts 用 `filterText` 过滤（直播==落库一致）
- [x] 4.3 coze：`coze-chat.provider.ts` 的 text-delta 写入走 `SensitiveWordWriter`；拼 `responseMessage` 前过滤 `fullText`
- [x] 4.4 dify：`dify-chat.provider.ts` 的 text-delta 写入走 `SensitiveWordWriter`；拼 `responseMessage` 前过滤 `fullText`
- [x] 4.5 三个 provider 从 `agent.sensitiveWordConfig` 读取配置并构建引擎；未启用时保持原行为

## 5. Direct 链路接线

- [x] 5.1 `agent-chat-completion.service.ts`：`writer.merge(result.toUIMessageStream().pipeThrough(new SensitiveWordTransformStream(filter)))`
- [x] 5.2 `agent-chat-completion.service.ts`：`onFinish` 内 `saveMessages` 前过滤 `responseMsg.parts` 的 text / reasoning 部分（与直播一致）
- [x] 5.3 从 `agent.sensitiveWordConfig` 读取配置构建引擎；未启用时保持原行为

## 6. 配置透传

- [x] 6.1 `agents.service.ts`：create / update 透传 `sensitiveWordConfig`
- [x] 6.2 详情返回接口确认 `sensitiveWordConfig` 可读（含发布广场详情如有必要）

## 7. 前端配置 UI

- [x] 7.1 在 `packages/client/src/pages/agents/detail/_components/configuration/interface/` 新增"敏感词过滤"配置区块（开关、词表编辑器、替换串、深度思考开关）
- [x] 7.2 接入现有配置保存/加载流（表单值 → update DTO → 回显）

## 8. 验证

- [x] 8.1 运行引擎单测与现有相关单测（`opencode-part-router.spec.ts` 等）确认无回归
- [x] 8.2 端到端验证：配置词表后，opencode 与 direct 智能体的直播输出、历史回显、跨块词场景均正确替换（以适配器层集成测试覆盖"直播==落库"一致性；完整端到端需真实 OpenCode server，留待部署环境）
- [x] 8.3 `openspec validate agent-sensitive-word-replacement` 通过
