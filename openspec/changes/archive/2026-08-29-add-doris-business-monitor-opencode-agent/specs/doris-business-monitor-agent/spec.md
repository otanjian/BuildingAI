## Purpose

为企业管理者和业务分析人员提供一个基于 Doris/SAP 经营数据的只读 OpenCode 分析入口，统一指标口径、证据追溯、异常解释和行动建议。

## ADDED Requirements

### Requirement: Agent is configured for enterprise business monitoring

The system SHALL expose an OpenCode agent whose workspace is `/Users/jiantan/ai_assistant/doris`, whose external OpenCode endpoint is `http://127.0.0.1:4096`, and whose generated artifacts are isolated under `artifacts/{conversationId}`.

#### Scenario: Agent starts with the Doris workspace

- **WHEN** a user starts a conversation with the configured agent
- **THEN** the OpenCode session is created against the Doris workspace and its report artifacts use the conversation-specific directory

### Requirement: Analysis uses read-only Doris evidence

The agent SHALL use the configured Doris MCP for catalog, query, semantic, governance, pipeline, lakehouse, cluster, and search inspection, and SHALL NOT use write-capable SAP, todo, or business mutation tools for analysis.

#### Scenario: User asks for a KPI or anomaly analysis

- **WHEN** the request requires enterprise data evidence
- **THEN** the agent discovers the relevant Doris capability, executes read-only retrieval, and cites the database/table/time scope used

### Requirement: Analysis follows business semantic controls

The agent SHALL identify business object, data grain, time range, organization scope, currency/unit, aggregation rule, and data freshness before presenting a conclusion; cross-table analysis SHALL verify the documented relationship and cardinality first.

#### Scenario: User asks a cross-domain question

- **WHEN** the answer joins sales, inventory, production, quality, finance, or other domains
- **THEN** the agent validates semantic definitions and relationships before calculating or comparing metrics, and states any unavailable or conflicting evidence

### Requirement: Responses are decision-oriented and bounded

The agent SHALL structure business responses as conclusion, evidence, impact scope, likely causes, recommended actions, and caveats, and SHALL distinguish observed facts from hypotheses or forecasts.

#### Scenario: Data is incomplete or an alert is detected

- **WHEN** the data is stale, incomplete, anomalous, or insufficient for attribution
- **THEN** the agent reports the limitation, avoids invented values, identifies the affected scope, and proposes the next verification step
