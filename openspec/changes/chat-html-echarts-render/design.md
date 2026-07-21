## Context

助手消息经 `MessageResponse`（Streamdown）渲染，插件为 `cjk` / `code` / `math` / `mermaid`，自定义 `code` 组件为 `CollapsibleMarkdownCode`。Streamdown 内置 `rehype-raw` + sanitize（`rehype-harden` / `rehype-sanitize`），因此内联 HTML 可部分解析，但脚本与危险属性被剥离。项目 catalog 已有 `echarts`，对话框未接入；控制台看板使用 Recharts，与本变更无关。

消费方：`packages/client` ask-assistant-ui（及任何复用 `MessageResponse` / reasoning Streamdown 的路径）。

## Goals / Non-Goals

**Goals:**

- 在对话消息中渲染安全 HTML 富文本
- 将 ` ```echarts `（及约定别名）围栏中的 option JSON 渲为 ECharts 交互图
- Streaming 下半截围栏不误渲染；失败可降级
- ECharts 动态加载，控制首屏成本

**Non-Goals:**

- 智能问数工具编排、ChartSpec、强制取数
- 默认可执行 HTML / sandbox iframe 完整页面
- 替换控制台 Recharts 看板

## Decisions

### 1. ECharts 走 Markdown 围栏，不走「HTML 内嵌脚本」

- **选择：** 语言标记 `echarts`（可选别名 `echarts-json`）+ JSON option → `EchartsBlock`
- **替代：** 放开 `<script>` 跑 CDN ECharts → XSS，否决；iframe sandbox → 本期过重，列为后续
- **接入点：** 扩展 `CollapsibleMarkdownCode`（或同层专用组件），在 `language === "echarts"` 时分支；`message.tsx` 与 `reasoning.tsx` 行为一致

### 2. HTML 依赖现有 sanitize，仅做行为确认与必要白名单微调

- **选择：** 不引入新 HTML 引擎；确认常见安全标签（如 `table` / `div` / `span` / 基础格式）可展示；禁止 `script`、内联事件、`javascript:` URL
- **替代：** 自研 HTML 渲染器 → 成本高、与 Streamdown 重复

### 3. Option 安全与校验

- **选择：** `JSON.parse` 后做浅层/约定校验：必须为 plain object；拒绝字符串形式的可执行 `formatter` / `function` 字段模式；尺寸与容器受控
- **失败：** 回退为普通代码块（可附简短错误提示）

### 4. 加载与生命周期

- **选择：** `import('echarts')`（或 `echarts/core` + 常用图表按需）lazy load；`init` / `setOption` / `dispose`；`ResizeObserver`；跟随主题（若现有 dark 变量可得则映射）
- **Streaming：** 使用已有 `useIsCodeFenceIncomplete`；incomplete 时显示占位或源码预览，complete 后再 init

### 5. 包归属

- **选择：** 渲染组件放在 `@buildingai/web/ui`（ai-elements 旁），client 无额外分叉逻辑
- **依赖：** `packages/@buildingai/web/ui` 声明对 catalog `echarts` 的依赖（若尚未声明）

## Risks / Trade-offs

- **[Risk] ECharts 包体积大** → Mitigation：动态 import；可选 core + 按需图表
- **[Risk] 模型输出非法 / 半截 JSON** → Mitigation：incomplete 不渲染；parse 失败降级代码块
- **[Risk] option 内嵌可执行字符串** → Mitigation：拒绝危险键/函数字符串模式
- **[Risk] sanitize 过严导致部分合法 HTML 被剥** → Mitigation：用固定样例验证；仅在缺口明确时扩大白名单
- **[Trade-off] 不支持「整页 HTML + 内嵌 ECharts」** → 接受；需要时另开 iframe 变更

## Migration Plan

- 纯前端增强，无 DB / API 迁移
- 发布后旧消息若含 ` ```echarts ` 会自动获得新渲染；无围栏的历史消息行为不变
- 回滚：移除语言分支与组件即可，无数据回填

## Open Questions

- 是否同时接受别名 `chart`？（建议本期仅 `echarts` / `echarts-json`，避免与普通 chart 叙述冲突）
- 是否在系统提示中引导模型使用围栏？（产品可选，非本变更硬依赖）
