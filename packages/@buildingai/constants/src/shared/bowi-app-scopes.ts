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

/** Enterprise apps from registry (loaded at build time via generated list). */
export const ENTERPRISE_BOWI_APP_SCOPES: BowiAppScope[] = [
    {
        appId: "inv-opt-ai",
        schema: "inv_opt_ai",
        tablePrefix: "inv-opt-",
        acronym: "INVO",
        productNameFull: "库存优化自治系统",
        triggerPhrase: "开始分析",
        tables: tablesForPrefix("inv-opt-"),
    },
    {
        appId: "proc-audit-ai",
        schema: "proc_audit_ai",
        tablePrefix: "proc-audit-",
        acronym: "PROC",
        productNameFull: "采购合规审查自治系统",
        triggerPhrase: "开始审查",
        tables: tablesForPrefix("proc-audit-"),
    },
    {
        appId: "ar-risk-ai",
        schema: "ar_risk_ai",
        tablePrefix: "ar-risk-",
        acronym: "ARR",
        productNameFull: "应收账款风控自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("ar-risk-"),
    },
    {
        appId: "ap-opt-ai",
        schema: "ap_opt_ai",
        tablePrefix: "ap-opt-",
        acronym: "APO",
        productNameFull: "应付账款优化自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("ap-opt-"),
    },
    {
        appId: "mfg-var-ai",
        schema: "mfg_var_ai",
        tablePrefix: "mfg-var-",
        acronym: "MFGV",
        productNameFull: "生产成本偏差自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("mfg-var-"),
    },
    {
        appId: "forecast-ai",
        schema: "forecast_ai",
        tablePrefix: "forecast-",
        acronym: "FCST",
        productNameFull: "销售预测校准自治系统",
        triggerPhrase: "开始校准",
        tables: tablesForPrefix("forecast-"),
    },
    {
        appId: "mdm-quality-ai",
        schema: "mdm_quality_ai",
        tablePrefix: "mdm-quality-",
        acronym: "MDM",
        productNameFull: "主数据质量自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("mdm-quality-"),
    },
    {
        appId: "asset-life-ai",
        schema: "asset_life_ai",
        tablePrefix: "asset-life-",
        acronym: "AST",
        productNameFull: "固定资产全生命周期自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("asset-life-"),
    },
    {
        appId: "tax-compliance-ai",
        schema: "tax_compliance_ai",
        tablePrefix: "tax-compliance-",
        acronym: "TAX",
        productNameFull: "税务合规自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("tax-compliance-"),
    },
    {
        appId: "otif-ai",
        schema: "otif_ai",
        tablePrefix: "otif-",
        acronym: "OTIF",
        productNameFull: "供应链 OTIF 自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("otif-"),
    },
    {
        appId: "quality-rca-ai",
        schema: "quality_rca_ai",
        tablePrefix: "quality-rca-",
        acronym: "QRCA",
        productNameFull: "质量异常追溯自治系统",
        triggerPhrase: "开始追溯",
        tables: tablesForPrefix("quality-rca-"),
    },
    {
        appId: "hr-compliance-ai",
        schema: "hr_compliance_ai",
        tablePrefix: "hr-compliance-",
        acronym: "HRC",
        productNameFull: "人力资源合规自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("hr-compliance-"),
    },
    {
        appId: "project-health-ai",
        schema: "project_health_ai",
        tablePrefix: "project-health-",
        acronym: "PRJH",
        productNameFull: "项目交付健康自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("project-health-"),
    },
    {
        appId: "energy-carbon-ai",
        schema: "energy_carbon_ai",
        tablePrefix: "energy-carbon-",
        acronym: "ENRG",
        productNameFull: "能源与碳排放自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("energy-carbon-"),
    },
    {
        appId: "contract-ai",
        schema: "contract_ai",
        tablePrefix: "contract-",
        acronym: "CTR",
        productNameFull: "合同履约自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("contract-"),
    },
    {
        appId: "channel-inv-ai",
        schema: "channel_inv_ai",
        tablePrefix: "channel-inv-",
        acronym: "CHI",
        productNameFull: "渠道库存协同自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("channel-inv-"),
    },
    {
        appId: "budget-control-ai",
        schema: "budget_control_ai",
        tablePrefix: "budget-control-",
        acronym: "BDG",
        productNameFull: "预算执行监控自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("budget-control-"),
    },
    {
        appId: "service-sla-ai",
        schema: "service_sla_ai",
        tablePrefix: "service-sla-",
        acronym: "SLA",
        productNameFull: "售后服务 SLA 自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("service-sla-"),
    },
    {
        appId: "fx-risk-ai",
        schema: "fx_risk_ai",
        tablePrefix: "fx-risk-",
        acronym: "FXR",
        productNameFull: "外汇风险自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("fx-risk-"),
    },
    {
        appId: "esg-report-ai",
        schema: "esg_report_ai",
        tablePrefix: "esg-report-",
        acronym: "ESG",
        productNameFull: "ESG 合规披露自治系统",
        triggerPhrase: "开始检查",
        tables: tablesForPrefix("esg-report-"),
    },
];

export const EHCS_BOWI_APP_SCOPE: BowiAppScope = {
    appId: "ehcs-ai",
    schema: "ehcs_ai",
    tablePrefix: "ehcs-",
    acronym: "EHCS",
    productNameFull: "EHCS数据健康自治系统",
    triggerPhrase: "开始检查",
    tables: tablesForPrefix("ehcs-"),
};

export const BOWI_APP_SCOPES: BowiAppScope[] = [EHCS_BOWI_APP_SCOPE, ...ENTERPRISE_BOWI_APP_SCOPES];

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
