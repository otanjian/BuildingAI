## Context

当前通用 SecretService 使用 Base64 简化实现，而 Feishu/WeCom 等局部模块已有版本化加密模式；Agent 发布配置和 MCP headers 仍与业务 JSON 混合。详见 proposal.md。

## Goals / Non-Goals

**Goals:**

- 用统一凭据引用替代 Agent/连接器中的明文或可逆弱保护字段。
- 抽象 KMS/Vault、AEAD、密钥版本和轮换窗口。
- 保护内部服务身份、运行时读取和秘密扫描路径。

**Non-Goals:**

- 不把第三方系统的授权审批复制到平台。
- 不在此 change 中设计完整的 Tool 风险策略，Tool Gateway 另行负责。

## Decisions

1. **凭据与配置分离。** Agent 版本只保存 `credentialRef`、provider、purpose 和 scope，数据库中不再存 headers/API key 明文；便于轮换而不改变 Agent 版本。
2. **使用 AEAD + 外部密钥管理。** 首选云 KMS/Vault 的 envelope encryption；密文记录 nonce、auth tag、算法和 keyVersion。相比自管静态 AES key，外部 KMS 提供审计、轮换和权限隔离。
3. **API key 哈希、连接凭据密文。** 需要验证的入站 token 只保存 Argon2id/HMAC 哈希；需要向第三方发送的出站凭据保存 AEAD 密文，读取时短期解密。
4. **服务身份替换共享密钥。** 内部 HTTP 优先 mTLS；当前桥接路径使用 audience、过期、jti 和轮换密钥签名的 60 秒短期服务令牌。保留开发环境兼容值但生产拒绝，并要求 `BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY`。
5. **迁移采用双读双写。** 新写入仅走凭据表；读取旧 JSON 仅用于迁移和一次性轮换，成功后清理旧秘密并记录校验哈希。

替代方案：只对数据库列做 Base64/静态加密不能抵御密钥与备份泄露；让模型持有长期 API key 会扩大提示词注入影响，因此不采用。

## Risks / Trade-offs

- [Risk] KMS 短暂不可用影响工具调用 → Mitigation：短期缓存仅保存受控密文/句柄，不缓存明文；按工具风险分级降级为只读或拒绝。
- [Risk] 轮换期间旧系统仍依赖旧字段 → Mitigation：设置双密钥重叠窗口，迁移指标归零后再删除旧字段。
- [Risk] 日志脱敏漏掉非标准凭据格式 → Mitigation：结构化日志白名单、秘密扫描和真实样本回放。
- [Risk] 运维人员无法调试 → Mitigation：提供受审批的短期 reveal/连接测试，并将操作者和目标完整审计。

## Migration Plan

1. 盘点 Agent.publishConfig、MCP headers、渠道凭据、环境变量和备份中的敏感值。
2. 部署 KMS/Vault、密钥版本和凭据表，新增 `credentialRef` 但保留旧列只读。
3. 批量迁移、轮换、校验第三方连接；迁移完成后清空旧 JSON 敏感字段。
4. 更新内部 OpenCode 接口，生产启动拒绝默认 key；开发环境采用显式临时配置。
5. 开启日志/镜像/对象存储扫描和告警，逐步收紧凭据 scope、过期和审批。
6. 异常时切回旧配置读取仅用于恢复，禁止把旧明文重新写入新记录；恢复操作必须审计。

## Open Questions

- 具体租户使用哪家 KMS/Vault 以及是否需要 BYOK，可在部署形态评审时确定，不改变凭据外部契约。

## Browser Acceptance Design

- 目标控制台入口：`/console/ai/credentials`（可复用现有 Secret/MCP 管理页，但必须能区分 credential metadata 和 secret value）。
- 种子数据：租户 A 的管理员、只读成员、一个沙箱连接器和一条可轮换测试凭据；连接测试使用无敏感数据的 mock endpoint。
- 正向流程：管理员创建/导入 → 提交后确认只显示掩码 → 轮换 → 刷新 → 查看 key version/status/last-used → 连接测试。
- 负向流程：只读用户访问、吊销后连接测试、浏览器网络响应检查均不得出现明文 secret/header/token。
- 证据：截图、脱敏网络状态、审计事件 ID 和秘密扫描结果；禁止将测试 secret 写入截图或测试报告。
- 运行浏览器验收的环境必须启用 test KMS/mock endpoint 和一次性 fixture；验收后销毁 fixture 并确认撤销事件已落审计。
