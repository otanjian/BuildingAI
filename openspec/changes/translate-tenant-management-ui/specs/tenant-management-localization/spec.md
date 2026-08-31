## Purpose

让中文用户进入租户管理后，可以用统一、清晰的中文理解租户、成员、项目、权限和治理状态，并完成原有管理操作。

## ADDED Requirements

### Requirement: Chinese tenant management copy

租户管理页面 SHALL 将标题、说明、字段标签、按钮、提示、空状态和可访问名称以中文展示。

#### Scenario: Open tenant management page

- **WHEN** 用户打开租户管理页面
- **THEN** 页面中的管理标题、租户选择、治理说明和资源探测说明均显示中文

#### Scenario: Use tenant management controls

- **WHEN** 用户邀请成员、创建项目、授权资源或切换租户
- **THEN** 对应标签、按钮、占位符和成功反馈显示中文，且操作请求保持原有行为

### Requirement: Translate dynamic status labels

租户管理页面 SHALL 将接口返回的已知租户、成员、项目、角色和治理状态映射为中文；未知值 SHALL 使用中文回退文本。

#### Scenario: Render known statuses

- **WHEN** 页面渲染 active、suspended、owner、tenant-wide 等状态
- **THEN** 用户看到对应的中文标签，而不是原始英文值

#### Scenario: Render unknown status

- **WHEN** 接口返回未预置的状态值
- **THEN** 页面显示中文的“未知”或等价回退文本，不直接显示英文状态
