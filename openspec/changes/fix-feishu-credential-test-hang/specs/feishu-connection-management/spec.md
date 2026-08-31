## MODIFIED Requirements

### Requirement: Connection lifecycle actions are isolated and explicit

系统 SHALL 支持对单条连接执行测试、启用、停用和删除。启用、停用或删除一条连接 MUST NOT 改变同一 Agent 的其他连接。删除前系统 MUST 要求二次确认；删除后必须停止该连接的运行实例、取消活动任务并清理或使其运行态失效。

#### Scenario: Credential test completes for a saved connection

- **WHEN** 管理员测试一条已保存连接且未重新填写密钥
- **THEN** 系统使用该连接已保存的凭证执行一次飞书鉴权，不递归进入兼容接口，并在成功或失败后返回有限时结果

#### Scenario: Credential provider does not respond

- **WHEN** 飞书鉴权服务在配置的超时时间内没有响应
- **THEN** 系统结束本次测试并返回测试失败原因，不让请求无限等待，也不启用或修改连接

#### Scenario: Credential test fails

- **WHEN** 管理员测试无效的飞书凭证
- **THEN** 系统返回测试失败原因，不启用连接，也不修改已保存配置

#### Scenario: Administrator enables one connection

- **WHEN** 管理员对一条已测试且配置有效的停用连接执行启用
- **THEN** 系统只启动该连接，并刷新该行的启用和运行状态

#### Scenario: Administrator toggles one connection

- **WHEN** 管理员启用或停用列表中的一条连接
- **THEN** 系统只改变该连接的启用状态和运行实例，其他连接继续保持原状态

#### Scenario: Administrator deletes an enabled connection

- **WHEN** 管理员确认删除一条已启用连接
- **THEN** 系统阻止新的事件进入，停止其运行实例，取消活动任务，清理或失效连接级运行态，再删除配置；其他连接继续运行
