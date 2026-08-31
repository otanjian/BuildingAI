## Context

当前仓库有 Agent 标注、提示词和运行时投影能力，但没有统一黄金集/红队集、结果存储、质量门禁或生产 readiness 证据。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 建立可版本化、可复现、可对比和可审计的评测流水线。
- 将安全、质量、成本、性能和运维证据接入 Agent 发布门禁。
- 将生产反馈安全地回灌为回归数据。

**Non-Goals:**

- 不使用单一“总分”替代业务验收，也不自动把所有线上数据纳入训练/评测。
- 不在本 change 内建设新的模型供应商。

## Decisions

1. **评测数据集独立版本化。** `eval_datasets/eval_cases` 带租户、项目、敏感级别和版本；运行记录固定 dataset/model/evaluator/retrieval/tool policy，保证可重现。
2. **规则指标 + LLM judge + 人工抽检组合。** 规则用于 ACL、PII、审批和结构化工具参数，模型评审用于事实性/风格，人审用于高风险和争议案例；结果保存 evaluator version。
3. **安全门禁优先于质量平均分。** 任何越权、凭据泄露、审批绕过或破坏性动作失败都可直接阻断，即使平均质量很高。
4. **灰度指标与离线门禁分开。** 离线评测决定是否可发布，线上 canary 观察真实延迟、成本、错误和反馈，超过阈值触发暂停/回滚。
5. **生产样本默认脱敏。** 从 Trace/审计抽取 query、结果和工具事件时先按分类/DLP 处理，原文只保存受控引用，避免评测集成为新的数据泄露面。
6. **Readiness 证据可签名。** 每个门禁绑定构建/版本、时间、执行人、报告哈希和豁免到期，供发布和审计查询。

7. **评测运行隔离。** Runner、LLM judge 和生产反馈回放默认使用 sandbox 凭据、受限出口和 mock/只读工具；任何真实写操作都必须显式批准且不能成为默认路径。

替代方案：只靠人工演示不可重复且无法回归；只测回答文本会漏掉权限、工具和成本问题，因此不采用。

## Risks / Trade-offs

- [Risk] LLM judge 不稳定或偏差 → Mitigation：固定 evaluator 版本、规则指标兜底、抽样人审和置信区间。
- [Risk] 评测集包含敏感业务数据 → Mitigation：脱敏、分类 ACL、受控 runner、报告摘要化和保留期限。
- [Risk] 门禁过严拖慢发布 → Mitigation：按风险分层、最小必跑集、并行 runner 和有到期日的豁免流程。
- [Risk] 线上反馈样本偏差 → Mitigation：按租户/渠道/任务分层抽样，保留基线和失败聚类。

## Migration Plan

1. 选取一个内部 Agent 建立 30～50 条脱敏黄金集和红队集，定义首版阈值。
2. 建立评测表、runner、报告 API，与 Agent 版本快照和审计/usage 关联。
3. 先以报告模式运行，不阻断发布；校准指标、人工复核和成本。
4. 对高风险安全门禁启用强阻断，对质量/性能逐步启用租户配置阈值。
5. 将 canary 指标、生产事故和用户反馈接入回归集，纳入下一版本门禁。
6. 若评测服务不可用，禁止高风险生产发布；已运行版本继续按现有回滚策略服务。

## Open Questions

- 各行业的质量阈值、人工评审比例和评测模型供应商可由业务评审确定，不改变结果与门禁契约。

## Browser Acceptance Design

- 目标控制台入口：`/console/ai/evaluations`、`/console/ai/readiness` 或 Agent 发布页中的 Evaluation/Readiness 标签。
- 种子数据：脱敏黄金集、红队集、一个运行中/可恢复 run、一个有越权失败的 run、一个通过 run、一个缺备份证据的 readiness、一个到期豁免。
- 正向流程：选择 Agent version/dataset → 启动/恢复 run → 查看进度和逐例结果 → 查看 gate → 打开 readiness checklist → 查看豁免和过期后的阻断。
- 负向流程：失败安全用例、缺失样本/配置 hash、未授权用户查看受限 case/导出、缺备份证据，均必须在 UI 阻断或脱敏。
- 证据：截图/录屏、run/report/gate/readiness IDs、版本 hash、样本计数和失败用例链接；测试集必须脱敏。
- 浏览器自动化必须在隔离评测环境中真实创建/运行/查看结果；不能通过修改数据库状态或直接调用 gate API 代替 UI 操作。
