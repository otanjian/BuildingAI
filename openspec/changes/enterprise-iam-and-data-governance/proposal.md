## Why

企业客户需要把 AI 平台接入现有目录、单点登录和数据治理体系，而当前平台级共享密钥 SSO 不能覆盖 OIDC/SAML、SCIM、MFA、离职回收和数据主体请求。没有身份生命周期和数据分类/保留/地域策略，企业无法给出合规的生产准入证据。

## What Changes

- 支持 OIDC 优先、SAML 2.0 可选的企业单点登录和域名/租户绑定。
- 支持 SCIM 用户、组、部门同步，以及禁用、离职、转岗的会话和凭据回收。
- 支持强制 MFA 和高风险操作 step-up authentication。
- 建立公开/内部/机密/严格受限的数据分类、DLP/PII 检测和字段脱敏策略。
- 配置模型供应商、对象存储、日志、向量库的数据驻留和跨区域传输策略。
- 支持数据导出、删除、更正、保留期限、法律保全、删除证明和供应商处理清单。
- 提供管理员控制台的 IdP/SCIM dry-run、MFA 策略、数据分类、导出/删除任务、法律保全和驻留策略状态；敏感数据只显示脱敏摘要。

## Capabilities

### New Capabilities

- `enterprise-iam-and-data-governance`: 提供企业身份接入、账号生命周期与 AI 数据治理。

### Modified Capabilities

<!-- None. Existing platform SSO becomes a compatibility bridge behind the new identity policy. -->

## Impact

- 影响认证/会话、用户和组织同步、管理控制台、资源分类、对话/文档/日志/备份存储及模型/连接器路由。
- 需要 IdP/SCIM/Webhook 适配器、MFA 组件、数据目录、保留/删除任务和治理 API。
- 依赖租户授权、凭据和审计 change 提供的上下文与事件。
- 浏览器验收必须覆盖 IdP 配置校验、SCIM dry-run、MFA step-up、分类阻断、导出/删除进度和法律保全状态。

## Non-Goals

- 不在本 change 内实现具体国家/行业认证取证；只提供可配置控制和证据接口。
- 不替代客户 IdP 或第三方模型供应商的合同与隐私义务。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization` 的租户成员和资源授权，消费 `enterprise-secret-and-credential-security` 的 IdP/连接凭据保护和 `audit-observability-and-cost-governance` 的审计/保留事件。
- `ai-evaluation-and-production-readiness` 和 Agent/Tool/RAG 运行时只消费本 change 的分类、驻留和 provider policy，不复制规则。
