#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { agentAvatarPath, buildAgentDescription } from "./agent-branding.mjs";
import { loadRegistry, mcpPrefix, ROOT } from "./registry.mjs";
function tablesForPrefix(tablePrefix) {
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

function getPairs(app) {
    const t = tablesForPrefix(app.tablePrefix);
    const schema = app.schema ?? app.tablePrefix.replace(/-/g, "_").replace(/-$/, "_ai");
    return [
        [`"ehcs_ai"."ehcs-check_rules"`, `"${schema}"."${t.checkRules}"`],
        ["ehcs-rca_sessions", t.rcaSessions],
        ["ehcs-app_settings", t.appSettings],
        ["ehcs-check_run_items", t.checkRunItems],
        ["ehcs-check_runs", t.checkRuns],
        ["ehcs-check_results", t.checkResults],
        ["ehcs-check_rules", t.checkRules],
        ['**ehcs-**', `**${app.tablePrefix}**`],
        ["**ehcs_ai**", `**${schema}**`],
        ['appId: "ehcs-ai"', `appId: "${app.appId}"`],
        ["开始检查", app.triggerPhrase],
        ['"ruleId": "RULE_001"', `"ruleId": "${app.rulePrefix}_001"`],
        ['"ruleId": "RULE_', `"ruleId": "${app.rulePrefix}_`],
        ["EHCS数据健康自治", app.agentName],
        ["EHCS（ERP 数据健康自治系统）", `${app.acronym}（${app.productNameFull}）`],
        ["ehcs-mcp", "bowi-mcp"],
        [
            "ehcs_start_full_check",
            `bowi_start_full_check（必须传 appId: "${app.appId}"）`,
        ],
        ["bowi_start_full_check：", `bowi_start_full_check（appId: "${app.appId}"）：`],
        ["ehcs_get_check_progress", "bowi_get_check_progress"],
        ["ehcs_cancel_check", "bowi_cancel_check"],
        ["ehcs_ingest_rule_result", "bowi_ingest_rule_result"],
        ["ehcs_sql_query", "bowi_sql_query"],
        ["ehcs_sql_execute", "bowi_sql_execute"],
        ["EHCS", app.acronym],
        ["EHCS_", `${app.acronym}_`],
        ["数据健康检查", app.productName.replace(/自治$/, "检查")],
        ["数据治理专员", `${app.productName}专员`],
        ["100 − (待解决高风险×10 + 中风险×5 + 低风险×2)", app.healthScore],
        ["EHCS_BOWI_APP_SCOPE", `${app.acronym}_BOWI_SCOPE`],
        [
            "import {\n    EHCS_BOWI_APP_SCOPE,\n    formatBowiTableScopeForAgent,\n} from \"@buildingai/constants/shared/bowi-app-scopes\";",
            `import {\n    formatBowiTableScopeForAgent,\n    getBowiAppScope,\n} from \"@buildingai/constants/shared/bowi-app-scopes\";\n\nconst ${app.acronym}_BOWI_SCOPE = getBowiAppScope(\"${app.appId}\")!;`,
        ],
        [`（ehcs-mcp）`, "（bowi-mcp）"],
        [`**ehcs-mcp**`, "**bowi-mcp**"],
        ["ehcs-mcp：", "bowi-mcp："],
    ].sort((a, b) => b[0].length - a[0].length);
}

function apply(s, pairs) {
    let out = s;
    for (const [a, b] of pairs) out = out.split(a).join(b);
    return out;
}

function main() {
    const template = fs.readFileSync(
        path.join(ROOT, "extensions/ehcs-ai/src/api/db/seed-data/ehcs-platform-agent.config.ts"),
        "utf8",
    );
    const data = loadRegistry();
    const filter = process.argv[2];
    const targets = filter
        ? data.apps.filter((a) => a.appId === filter)
        : data.apps;

    for (const app of targets) {
        if (filter && app.appId !== filter) continue;
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) continue;
        const prefix = app.tablePrefix.replace(/-$/, "");
        const scopeApp = { ...app, appId: app.appId };
        let out = apply(template, getPairs(scopeApp));
        if (app.appId !== "ehcs-ai") {
            out = out.replace(
                /formatBowiTableScopeForAgent\(EHCS_BOWI_APP_SCOPE\)/g,
                `formatBowiTableScopeForAgent(${app.acronym}_BOWI_SCOPE)`,
            );
        }
        out = out.replace(
            /export const [A-Z]+_PREFERRED_MCP_NAME_HINTS = \[[\s\S]*?\];/,
            `export const ${app.acronym}_PREFERRED_MCP_NAME_HINTS = ["bowi-mcp", "bowi", "erp", "erpnext"];`,
        );
        const acronym = app.acronym;
        const desc = buildAgentDescription(app).replace(/"/g, '\\"');
        const avatar = agentAvatarPath(app.appId);
        out = out.replace(
            new RegExp(
                `export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =[\\s\\S]*?;`,
            ),
            `export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =\n    "${desc}";`,
        );
        if (out.includes(`${acronym}_PLATFORM_AGENT_AVATAR`)) {
            out = out.replace(
                new RegExp(
                    `export const ${acronym}_PLATFORM_AGENT_AVATAR = "[^"]*";`,
                ),
                `export const ${acronym}_PLATFORM_AGENT_AVATAR = "${avatar}";`,
            );
        } else {
            out = out.replace(
                new RegExp(
                    `(export const ${acronym}_PLATFORM_AGENT_DESCRIPTION =[\\s\\S]*?;)`,
                ),
                `$1\n\nexport const ${acronym}_PLATFORM_AGENT_AVATAR = "${avatar}";`,
            );
        }
        const outPath = path.join(extDir, "src/api/db/seed-data", `${prefix}-platform-agent.config.ts`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, out, "utf8");
        console.log(`Agent config: ${outPath}`);
    }
}

main();
