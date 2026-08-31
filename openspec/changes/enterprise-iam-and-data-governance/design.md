## Context

现有平台有基于共享密钥的平台 SSO 桥接，但未形成 OIDC/SAML/SCIM/MFA 与数据分类、保留、导出、删除、地域控制。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 接入企业目录并自动回收账号、会话和权限。
- 对 AI 数据全生命周期实施分类、最小化、留存、导出、删除和驻留策略。
- 把身份和数据策略决定带入运行时、模型路由、工具和治理任务。

**Non-Goals:**

- 不替客户完成法律判断、合同签署或认证审计。
- 不把所有历史原文无条件迁移到新数据目录。

## Decisions

1. **OIDC 优先、SAML adapter 化。** OIDC 作为默认现代协议，SAML 通过租户配置适配；平台只信任已绑定 issuer/audience/domain，平台共享密钥保留兼容但标为 legacy。
2. **SCIM 事件 + 定期对账。** 事件用于快速禁用和组变更，定期全量对账修复丢失 webhook；所有目录事件幂等。
3. **MFA 由 IdP 与平台 step-up 组合。** 首选企业 IdP MFA，平台对凭据、导出、破坏性审批要求短期 step-up proof，不保存第三方 MFA 秘密。
4. **分类元数据先行。** 在关系记录、对象存储和向量元数据中保存 classification/retention/legalHold 引用，模型路由和 DLP 以此做决定。
5. **删除异步且可证明。** 删除/导出采用 job + manifest + audit，先逻辑屏蔽，再清理对象、向量、缓存和备份；法律保全优先。
6. **Policy-aware provider router。** 统一模型/存储/日志路由读取 residency/vendor-training 策略，禁止单个 Agent 通过 provider ID 绕过。

替代方案：只增加本地账号无法满足目录生命周期；只保留隐私声明无法证明实际删除和地域限制，因此不采用。

## Risks / Trade-offs

- [Risk] IdP/SCIM 配置错误导致大规模拒绝或误禁用 → Mitigation：dry-run、变更审批、回滚快照、对账和紧急 break-glass。
- [Risk] 分类误标导致过度阻断 → Mitigation：字段级规则、人工复核、例外短期有效并审计。
- [Risk] 删除跨越异步索引/备份耗时 → Mitigation：实时逻辑屏蔽、任务进度、重试和删除证明，不承诺瞬时物理消失。
- [Risk] 区域策略增加供应商和运维成本 → Mitigation：provider capability registry 和按租户分层部署。

## Migration Plan

1. 为租户增加 IdP、SCIM、MFA、分类、留存和驻留策略配置，保留现有共享密钥桥接。
2. 接入 OIDC 与 SCIM dry-run，映射用户/组/部门，先只同步不撤权。
3. 开启登录、禁用和 step-up 策略；对高风险租户做灰度。
4. 给对话、文档、向量、日志和备份补分类/保留元数据，建立导出删除 Job。
5. 将模型/存储/向量路由切换到 policy-aware router，逐步关闭不合规 provider。
6. 失败时停用租户 IdP/路由开关并回退到已审计的兼容认证；保留治理事件和回滚证据。

## Open Questions

- 具体行业的默认分类词典、保留期和区域清单需要由客户合规团队确认，可配置化而不改变基础流程。

## Browser Acceptance Design

- 目标控制台入口：`/console/identity`、`/console/governance`、`/console/data-requests` 或等价管理工作区。
- 种子数据：一个有效 IdP、一个无效 IdP 配置、待处理 SCIM disable/group 事件、强制 MFA 租户、受限字段、导出/删除任务和 active legal hold。
- 正向流程：管理员执行 IdP dry-run → 查看 SCIM 同步 → 配置 MFA/classification/residency → 查看导出/删除进度和法律保全阻断 → 刷新。
- 负向流程：无效 IdP 不激活、普通成员访问管理页、向不合规 provider 路由、法律保全数据删除，均显示安全结果。
- 证据：截图/录屏、dry-run/SCIM/job IDs、策略版本和脱敏统计；不保存 IdP client secret、原文或个人敏感数据。
- 浏览器自动化使用隔离 IdP sandbox/SCIM fixture 和无真实个人数据的治理任务；所有配置变更可回滚，不能在生产租户上直接试验。
