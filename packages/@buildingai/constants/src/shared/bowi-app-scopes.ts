/**
 * Per-app DB scope for bowi-mcp (aligned with docs/enterprise-ai-apps-registry.json + ehcs-ai).
 */
export type BowiAppScope = {
    appId: string;
    schema: string;
    tablePrefix: string;
    acronym: string;
    productNameFull: string;
    triggerPhrase: string;
    tables: {
        checkRules: string;
        checkResults: string;
        checkRuns: string;
        checkRunItems: string;
        appSettings: string;
        rcaSessions: string;
    };
};

function tablesForPrefix(tablePrefix: string) {
    const p = tablePrefix.endsWith("-") ? tablePrefix : `${tablePrefix}-`;
    return {
        checkRules: `${p}check_rules`,
        checkResults: `${p}check_results`,
        checkRuns: `${p}check_runs`,
        checkRunItems: `${p}check_run_items`,
        appSettings: `${p}app_settings`,
        rcaSessions: `${p}rca_sessions`,
    };
}

export const EHCS_BOWI_APP_SCOPE: BowiAppScope = {
    appId: "ehcs-ai",
    schema: "ehcs_ai",
    tablePrefix: "ehcs-",
    acronym: "EHCS",
    productNameFull: "EHCS数据健康自治系统",
    triggerPhrase: "开始检查",
    tables: tablesForPrefix("ehcs-"),
};

export const BOWI_APP_SCOPES: BowiAppScope[] = [EHCS_BOWI_APP_SCOPE];

const scopeByAppId = new Map(BOWI_APP_SCOPES.map((s) => [s.appId, s]));

export function getBowiAppScope(appId: string): BowiAppScope | undefined {
    return scopeByAppId.get(appId);
}

export function qualifyTable(scope: BowiAppScope, table: string): string {
    return `"${scope.schema}"."${table}"`;
}

export function formatBowiTableScopeForAgent(scope: BowiAppScope): string {
    const t = scope.tables;
    return `# 数据范围（硬性约束）

你仅服务于 **${scope.productNameFull}**（appId: \`${scope.appId}\`）。

- 调用 **bowi-mcp** 时 **必须** 传入 \`appId: "${scope.appId}"\`。
- 仅允许访问 PostgreSQL schema **${scope.schema}** 中的下列表（SQL 中须双引号引用）：
  - \`${t.checkRules}\` — 检查规则
  - \`${t.checkResults}\` — 异常/检查结果
  - \`${t.checkRuns}\` / \`${t.checkRunItems}\` — 全量检查批次
  - \`${t.appSettings}\` — 应用设置
  - \`${t.rcaSessions}\` — 根因分析会话
- **禁止** 访问其它 schema 或其它企业应用的表；禁止编造 appId。
- 业务单据数据仍通过 **ERP MCP** 获取，不得用 bowi_sql_* 替代 ERP 取数。`;
}
