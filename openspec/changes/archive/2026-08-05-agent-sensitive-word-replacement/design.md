## Context

See `proposal.md` — Why / What Changes.

代码库现状（已核实）：

- 智能体输出有四条链路，全部经 `packages/api/src/modules/ai/agents/`：
  1. `providers/opencode-chat.provider.ts` — 代码连接型智能体（本次主诉求），文本块经 `writeChunks()` 直接 `writer.write`，落库前用 `partRouter.fullText` 拼 `responseParts`
  2. `providers/coze-chat.provider.ts` / `providers/dify-chat.provider.ts` — 同构：直接 `writer.write(text-delta)`，落库前用累计 `fullText` 拼 `responseMessage`
  3. `services/agent-chat-completion.service.ts` — direct（ToolLoop）智能体，`writer.merge(result.toUIMessageStream())`，落库前从 `responseMsg.parts` 提取文本
- `ai@6.0.138` 的 `createUIMessageStream` 实现已确认：`writer.merge(stream)` 直接把 chunk enqueue 进 controller，**不经过 `writer.write`**。因此装饰器方案只能覆盖直接 `write` 的链路，direct 链路必须在 merge 之前用 TransformStream 拦截。
- 现有 per-agent JSON 配置范式：`ai_agent` 表 `annotationConfig` 等 `json` 列 + `@buildingai/types/ai/agent-config.interface.ts` 类型 + `agents.service.ts` 透传 + 前端 `agents/detail/_components/configuration/interface/` 配置区块。

## Goals / Non-Goals

**Goals:**

- 同一份敏感词表/替换串，在直播 SSE 与落库历史两条出口上结果完全一致（含流式尾部 flush）。
- 全部智能体链路（opencode / coze / dify / direct）复用同一过滤引擎，接线点各自薄壳化。
- 无第三方依赖；未启用过滤时链路零额外开销。

**Non-Goals:**

- 覆盖工具调用输入/输出、HTML 产物文件、用户输入侧（见 spec 的 Out-of-scope requirement）。
- 模糊/变体匹配（插字符、谐音绕过）；仅精确匹配 + 大小写不敏感。
- 存量历史数据清洗（v1 只保证新数据干净）。

## Decisions

### D1. 匹配引擎：AC 自动机（Aho–Corasick）

一次编译、O(n) 线性扫描、多词同时命中。中文敏感词过滤的标准做法，无第三方依赖。

- 匹配前做大小写归一（Latin 大小写不敏感），替换时按原文切片，保留原始大小写文本。
- 重叠词取**最长匹配优先**，从左到右贪婪替换。
- 启用时构建一次自动机（词表几百条 < 1ms），可用词表内容哈希做进程内缓存。

*Alternatives*: 逐词 `indexOf` 循环（多词时退化为 O(词数·n)，中文词表下不划算）；正则 `new RegExp(words.join('|'))`（词表大时编译慢、无缓冲边界控制、转义易错）。均被否决。

### D2. 流式分块边界：holdback 缓冲

LLM 按 delta 吐字，敏感词可能跨块。每个流式实例维护长度 `maxWordLen - 1` 的滞留尾缓冲：

- `push(delta)`：拼接滞留 → 判定安全前缀（尾部保留 `maxWordLen - 1` 字符）→ 输出过滤后的安全前缀
- `flush()`：清空剩余滞留（末尾不足一个词长时原样输出）
- UTF-16 代理对边界：切片若落在代理对中间则回退一位，避免拆坏 emoji 等字符
- `finish-step` 前必须 flush，否则结尾若干字符不显示

*Alternatives*: 直接对每个 delta 做 replace（漏跨块词）；把整段缓冲到结束一次性过滤（失去流式体验）。均被否决。

### D3. 两个薄壳适配器，共用引擎

- `SensitiveWordWriter`：包装 `writer.write`，对 `text-delta` / `reasoning-delta` 的 delta 走流式过滤，其余 chunk 类型原样透传。用于三个第三方 provider（opencode/coze/dify）的 `writeChunks`/`write` 调用点。
- `SensitiveWordTransformStream`（TransformStream）：direct 链路 `writer.merge(stream.pipeThrough(transform))` 前拦截——因为 merge 不走 `writer.write`（见 Context 的技术发现），装饰器在此无效。

错误文本（如 opencode `appendErrorText` 的 session error）也走一次过滤，避免内部路径信息泄漏。

### D4. 落库前一致性：批量 `filterText(全文)`

- 三个第三方 provider：拼 `responseParts` / `responseMessage` 前，对 `fullText` 与持久化的 reasoning parts 逐条 `filterText`
- direct 链路：`onFinish` 内 `saveMessages` 前过滤 `responseMsg.parts` 的 text/reasoning 部分

同一词表同一引擎，批量结果与直播（含尾部 flush）一致。验收测试断言：**对同一语料，流式结果 === 批量结果**。

### D5. 配置模型：per-agent JSON 列（跟随 `annotationConfig` 范式）

`ai_agent.sensitiveWordConfig`（json，nullable）：

```ts
interface SensitiveWordConfig {
  enabled: boolean;          // 是否开启
  words: string[];           // 敏感词列表（中英文）
  replacement?: string;      // 替换串，默认 "***"
  applyToReasoning?: boolean; // 是否过滤深度思考，默认 true
}
```

接线：`agent-config.interface.ts` 加类型 → `AgentCore` / `UpdateAgentConfigParams` → `agents.service.ts` create/update 透传 → 前端 `configuration/interface/` 新增配置区块。

*Alternatives*: 平台级全局词表 + per-agent 叠加（权限/合并逻辑更复杂，留作 v2）；独立数据表（对词表量级过度设计）。均被否决。

### D6. 快速指令 / 问答标注回复

管理端手写内容（`quickCommandHandler`），默认不过滤。机制上 `SensitiveWordWriter` 装饰器可顺带覆盖，但默认不启用，避免管理员自查内容被意外替换。

## Risks / Trade-offs

- [跨块词漏网] → holdback 缓冲长度 = maxWordLen-1 + flush 兜底 + 一致性单测覆盖
- [直播与历史不一致] → 直播走流式、落库走批量，同一引擎 + 流式==批量断言
- [代理对拆坏（emoji）] → 切片回退一位，单测覆盖
- [超长词表性能] → AC 自动机 O(n)；词表哈希缓存；未启用零开销
- [误替换正常文本（如缩写恰好命中）] → 词表由管理员按需配置；v1 只做精确匹配，文档注明限制
- [快速指令/标注回复绕过] → 明确为可接受边界（非 AI 生成内容），文档说明

## Migration Plan

- 仅新增列（nullable json）+ 新增代码路径，无破坏性变更；旧数据 `sensitiveWordConfig` 为空 → 视为未启用，行为不变。
- 回滚：代码回滚即可，无数据迁移动作。
- 部署顺序：types/entity → 引擎 + 接线 → 前端配置 UI。

## Open Questions

- 是否需要将词表扩展到平台级全局默认词表（v2）——不影响本 change 的 spec/任务结构。
- 是否需要覆盖快速指令/标注回复的输出（v2）——与 spec 无冲突，可在任务中预留开关。
