## Context

现有 `DatasetsRetrievalService` 从数据库加载某数据集全部分段并在 Node 中计算相似度，Agent Chat 直接按 ID 调用，没有用户/租户 ACL 上下文。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 将租户/项目/ACL 过滤前置到检索，并提供统一检索 DTO。
- 通过向量索引和异步流水线支持规模增长、重嵌入和删除。
- 保留来源、引用、版本和可观测性。

**Non-Goals:**

- 不实现所有文档格式解析器；现有解析器通过统一 Job 接口接入。
- 不绑定单一向量数据库供应商。

## Decisions

1. **统一 RetrievalContext。** 检索服务接受已验证的 tenant/project/actor/dataset scope，拒绝只传 `datasetId` 的全局查询；服务层再次检查绑定关系。
2. **先过滤后排序。** 将 ACL、classification、有效版本和状态作为向量/关键词查询的过滤条件，避免先召回再丢弃导致越权或性能浪费。
3. **可替换 IndexAdapter。** 首选 PostgreSQL pgvector（现有 PostgreSQL 部署成本低），抽象为 adapter 以便大客户切换独立向量库；索引版本和 embedding model 写入元数据。
4. **异步幂等流水线。** 使用已有 BullMQ 能力拆分 parse/embed/index/delete 阶段，基于 source checksum + parser/chunk/embed 版本去重，失败进入 DLQ。
5. **撤销优先逻辑删除。** ACL 撤销立即在关系表标记无效，检索查询过滤无效记录，向量物理清理异步完成，兼顾安全窗口和大规模清理成本。
6. **敏感查询最小记录。** 日志只保存 query digest、耗时、命中数和检索版本，不保存完整敏感 query 或内容。

7. **文档是非可信数据。** 解析前执行文件类型/大小/恶意内容和压缩展开限制；进入模型上下文时使用明确的引用分隔与提示词注入检测，不能让文档内容改变系统或工具权限。

替代方案：继续应用层全扫描无法支撑大数据量；只在 Agent 绑定时校验无法应对文档级 ACL 变化；先向量召回再过滤会有越权窗口，因此不采用。

## Risks / Trade-offs

- [Risk] pgvector 索引升级或重建耗时 → Mitigation：按租户/数据集分批、双索引、后台重建和可回退 adapter。
- [Risk] ACL 变更与异步索引延迟不一致 → Mitigation：关系库有效标记作为实时过滤真相，索引仅做候选召回。
- [Risk] 重嵌入期间混用向量维度 → Mitigation：embedding model/version/dimension 强制写入并按索引版本路由。
- [Risk] 解析失败导致知识缺口 → Mitigation：任务状态、失败原因、重试和人工重放可见，Agent 不把未完成数据当作完整知识库。

## Migration Plan

1. 为数据集/文档/分段增加租户、项目、分类、ACL、来源版本和嵌入版本字段。
2. 建立 IndexAdapter 和 shadow retrieval，与现有全扫描结果对比召回和权限差异。
3. 建立异步 parse/embed/index/delete 队列，先迁移一个内部数据集。
4. 开启检索前 ACL 过滤，再逐租户切换索引；记录 p95、召回、越权和失败指标。
5. 删除/撤销流程切换到逻辑即时屏蔽 + 异步物理清理，最后下线全扫描路径。
6. 出现索引问题时回退到兼容 adapter，但保留租户/ACL 过滤，禁止回退到无上下文全局检索。

## Open Questions

- 大客户是否需要独立向量库或按区域部署，可依据容量和数据驻留评估决定，不改变检索权限契约。

## Browser Acceptance Design

- 目标控制台入口：`/console/ai/datasets` 和 `/datasets/:id` 的知识库管理/检索预览页。
- 种子数据：租户 A 中可见文档、同数据集下对测试用户不可见文档、一个待处理导入、一个可撤销文档，以及可模拟失败的索引 provider。
- 正向流程：查看成员权限 → 上传无敏感测试文档 → 观察解析/嵌入/索引进度 → 检索预览 → 查看授权引用 → 撤销 → 删除并查看证明。
- 负向流程：普通用户预览不可见文档、索引不可用/维度不兼容、删除中重复操作，均显示安全状态且不返回跨 ACL 内容。
- 证据：截图/录屏、文档版本/任务 ID、检索结果引用和删除证明；测试文档不得包含真实企业数据。
- 浏览器自动化必须真正上传/查看/撤销/删除测试文件；只构造检索 API 请求不能替代 UI 验收。
