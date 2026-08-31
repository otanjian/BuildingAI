## Why

当前数据集和分段缺少租户/项目上下文，Agent 聊天按数据集 ID 直接检索，检索器还在应用层全量扫描分段。企业知识库需要在召回前执行 ACL，并使用可扩展的向量索引、异步摄取和可证明的删除流程。

## What Changes

- 为数据集、文档、分段、嵌入和摄取任务增加租户、项目、分类和 ACL 元数据。
- 改造检索契约，必须携带租户、项目、用户/服务身份和可读资源范围。
- 采用 PostgreSQL pgvector 或独立向量库的近似索引与组合过滤，替代应用层全量余弦扫描。
- 将解析、切分、嵌入、索引更新和删除改为可重试、可暂停、可恢复的异步任务。
- 支持混合检索、可选 reranker、来源/版本/解析器元数据和引用返回。
- 实现文档撤销、删除、导出、重嵌入和模型版本迁移的可审计生命周期。
- 为索引不可用、embedding 维度不兼容、解析失败和权限服务超时定义 fail-closed/降级语义，不能回退到无 ACL 的全量检索。
- 将上传文档视为不可信输入，增加恶意文件/宏/压缩炸弹扫描、内容隔离和提示词注入防护。
- 提供控制台知识库的数据分类、成员权限、导入进度、失败重试、召回预览、撤销和删除证明页面。

## Capabilities

### New Capabilities

- `tenant-aware-rag-and-vector-index`: 提供租户隔离、ACL 预过滤和可扩展向量检索流水线。

### Modified Capabilities

<!-- None. Existing dataset APIs migrate to the tenant-aware retrieval contract. -->

## Impact

- 影响 `datasets`、documents、segments、retrieval service、Agent Chat 数据集工具和 vectorization queues。
- 需要数据库/向量索引迁移、异步 Worker、检索 API 契约和文档删除/重嵌入任务。
- 依赖 `enterprise-tenant-and-authorization` 的租户上下文和资源授权。
- 浏览器验收必须验证可见文档、不可见文档、导入进度、撤销即时生效、删除证明和索引异常提示。

## Non-Goals

- 不在本 change 内定义企业身份协议或通用 DLP 引擎。
- 不强制选择单一向量供应商；实现以可替换 adapter 和统一过滤语义为准。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization` 的数据集/文档 ACL；消费 `audit-observability-and-cost-governance` 的任务与检索观测。
- Agent 版本只引用数据集/索引版本，本 change 不负责 Agent 发布审批或通用 DLP 分类规则。
