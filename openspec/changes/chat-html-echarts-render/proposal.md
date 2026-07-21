## Why

BuildingAI 对话框目前用 Streamdown 渲染 Markdown，已支持代码高亮、数学公式和 Mermaid，但无法可靠展示富文本 HTML，也不能把 ECharts option 渲成交互图表。模型或上游若输出 HTML / ECharts 内容，用户只能看到代码文本，体验断裂。

**Why now：** 产品需要在对话内直接展示 HTML 片段与 ECharts 图表，作为消息渲染能力补齐；不绑定问数编排或取数工具链。

## What Changes

- 助手消息支持 **安全 HTML** 展示（经现有 sanitize，禁止可执行脚本）
- 助手消息支持 **ECharts 图表**：识别 Markdown 围栏（如 ` ```echarts `）中的 option JSON，渲染为交互图表
- Streaming 时等代码围栏完整后再渲染图表；解析失败时降级为普通代码块
- ECharts 按需动态加载，避免首屏体积膨胀

**Non-goals**

- 不实现智能问数 / 强制查数工具链 / ChartSpec 业务编排
- 不默认放开任意可执行 HTML（`<script>` / 事件处理器）
- 不默认引入 sandbox iframe 跑完整 HTML 页面（除非后续单独立项）
- 不要求改看板/控制台现有 Recharts 用法

## Capabilities

### New Capabilities

- `chat-message-rich-render`: 对话消息中安全 HTML 与 ECharts 围栏的渲染行为、降级与安全约束

### Modified Capabilities

- （无）现有 `openspec/specs/` 均为 EHCS 领域能力，本变更为平台对话框渲染，不修改其需求

## Impact

- **UI：** `packages/@buildingai/web/ui`（`MessageResponse` / Streamdown `code` 组件）、`packages/client` ask-assistant-ui 消息展示
- **依赖：** 使用已有 catalog 中的 `echarts`（按需加载）
- **API / DB：** 无契约或存储变更
- **安全：** HTML 继续走 sanitize；ECharts option 需拒绝可执行 formatter 等危险字段
