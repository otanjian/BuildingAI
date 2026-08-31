## Why

租户管理页面目前混用英文标题、说明、状态和操作文案，中文用户需要在同一页来回理解不同语言。现在统一为中文，可以让控制台菜单进入后的内容与现有中文导航保持一致。

## What Changes

- 将租户管理页面的标题、说明、表单标签、按钮、状态和空状态文案翻译为中文。
- 将租户、成员、项目和资源授权相关的动态状态映射为中文显示，同时保留接口传值不变。
- 保持现有租户切换、成员邀请、项目创建、资源授权和权限探测行为不变。

## Capabilities

### New Capabilities

- `tenant-management-localization`: 为租户管理控制台提供完整中文界面文案。

### Modified Capabilities

- 无。

## Impact

- 前端：`packages/client/src/pages/console/tenant/index.tsx`。
- 测试：新增针对租户页面中文文案和状态映射的轻量单元测试。
- 后端 API、数据结构和权限行为不变。
