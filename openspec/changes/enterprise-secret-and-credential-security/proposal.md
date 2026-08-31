## Why

平台当前将发布令牌、MCP headers 和第三方连接信息放在可变配置中，通用 SecretService 的“加密”仍是 Base64 简化实现，且内部 OpenCode 接口存在可预测默认共享密钥。企业生产环境需要可轮换、可吊销、最小权限且不可在日志和模型上下文中泄露的凭据体系。

## What Changes

- 建立租户作用域的统一 Credential 实体，保存密文、算法、nonce、认证标签、密钥版本、作用域、过期和吊销状态。
- 将 Agent 发布 token/API key、MCP/ERP/渠道 headers 从 Agent JSON 中迁移到凭据表，并只向外返回哈希/掩码信息。
- 接入 KMS/Vault 或等价密钥管理抽象，支持密钥版本化、双密钥轮换和启动时配置校验。
- 内部服务调用改为 mTLS 或短期服务令牌，禁止使用可预测默认密钥或跳过认证的生产端点。
- 运行时按最小权限获取短期凭据，禁止进入模型 prompt、前端响应、普通日志和审计原文。
- 提供存量凭据盘点、批量轮换、吊销、泄露扫描和事件响应流程。
- 提供控制台中的凭据元数据、轮换、吊销、连接测试和审计查看；浏览器永远只显示掩码值。

## Capabilities

### New Capabilities

- `enterprise-secret-and-credential-security`: 提供企业级凭据存储、访问、轮换、吊销和内部服务身份。

### Modified Capabilities

<!-- None. Existing Agent and channel APIs are migrated behind compatible credential references. -->

## Impact

- 影响 `packages/core` SecretService、`packages/@buildingai/db` 凭据实体和迁移、Agent 发布接口、MCP/渠道连接器、OpenCode 内部接口。
- 需要部署 KMS/Vault、密钥轮换任务、秘密扫描、审计与事件响应告警。
- 数据库备份和旧配置中的凭据需要一次性清点与轮换。
- 浏览器验收必须覆盖正常轮换、吊销后失败、权限不足和明文不回显；不能只验证加密单测。
- 开发环境的安全 provider 只能用于测试，生产必须使用外部 KMS/Vault；连接测试使用隔离沙箱，不允许用真实生产凭据做验收。

## Non-Goals

- 不在本 change 内定义完整的企业 SSO/SCIM 流程。
- 不改变第三方业务系统的权限模型；只控制平台如何安全引用其凭据。

## Dependencies and Boundary

- 依赖 `enterprise-tenant-and-authorization` 提供租户/项目/Agent 版本授权上下文。
- 被 `tool-gateway-and-egress-policy`、Agent 发布和渠道连接器消费；所有凭据读取必须通过统一 resolver，不能保留旁路明文配置。
