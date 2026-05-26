#!/usr/bin/env node
/**
 * Generate PRD + DB docs for 20 enterprise AI apps from EHCS templates.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const DOCS = path.join(ROOT, "docs");

const registry = JSON.parse(
  fs.readFileSync(path.join(DOCS, "enterprise-ai-apps-registry.json"), "utf8"),
);

function mcpPrefix(tablePrefix) {
  return tablePrefix.replace(/-$/, "").replace(/-/g, "_");
}

function buildSampleRules(app) {
  const domains = app.businessDomains;
  const samples = [
    [1, domains[0], "核心主数据", "必填字段完整且格式符合规范", 10, "高", false],
    [2, domains[0], "业务单据", "关键业务日期不得为空", 10, "中", false],
    [3, domains[1] || domains[0], "金额与数量", "金额>0 且计量单位有效", 15, "高", false],
    [4, domains[1] || domains[0], "审批链", "超过阈值单据须存在审批记录", 12, "中", false],
    [5, domains[2] || domains[0], "跨模块一致性", "上下游单据数量/金额容差在阈值内", 8, "中", false],
    [6, domains[2] || domains[0], "主从关联", "子记录必须关联有效父记录", 8, "中", false],
    [7, domains[3] || domains[0], "时效性", "超期未处理记录须标记风险", 10, "高", false],
    [8, domains[3] || domains[0], "重复检测", "同一业务键不得重复建档", 5, "低", true],
  ];
  return samples
    .map(
      ([n, domain, item, desc, score, sev, fix]) =>
        `| ${app.rulePrefix}_${String(n).padStart(3, "0")} | ${domain} | ${item} | ${desc} | ${score} | ${sev} | ${fix ? "是" : "否"} | 是 |`,
    )
    .join("\n");
}

function buildSampleAnomalies(app) {
  return `| ${app.rulePrefix}-20260525-001 | ${app.rulePrefix}_001 | ${app.productName}示例异常：规则触发 | 中 | 业务数据不满足规则约束 | 按建议方案整改 | 待解决 |
| ${app.rulePrefix}-20260525-002 | ${app.rulePrefix}_008 | ${app.productName}示例异常：低危可自动修复 | 低 | 历史数据格式不一致 | Agent 自动修复演示 | ai自动修复 |`;
}

function buildErpTable(app) {
  return app.erpDoctypes.map((d) => `| ${d} | MCP 取数 / 校验 / 可选写回 |`).join("\n");
}

function buildExtensionSection(app) {
  if (!app.extensionColumns?.length) return "";
  const lines = app.extensionColumns
    .map((ext) => {
      const cols = ext.columns.map((c) => `- \`${c}\``).join("\n");
      return `### V1.1 扩展列 — \`${ext.table}\`\n\n${cols}`;
    })
    .join("\n\n");
  return `\n---\n\n## V1.1 规划扩展列（实现时迁移）\n\n${lines}\n`;
}

function buildGlossary(app) {
  const rows = [
    `| ${app.acronym} | ${app.productNameFull} |`,
    `| MCP | Model Context Protocol；Agent 访问 ERP 的协议 |`,
    `| 健康分 | \`${app.healthScore}\`（仅计待解决异常） |`,
    `| 自动修复 | 规则允许且 Agent 经 MCP 写回 ERP（见 §1.4） |`,
    `| 根因分析 | 针对单条异常的多步交互推理诊断 |`,
  ];
  const extra = {
    INVO: "| SS / ROP / EOQ | 安全库存 / 再订货点 / 经济批量 |",
    OTIF: "| OTIF | On-Time In-Full 交付绩效 |",
    FCST: "| MAPE | 平均绝对百分比误差 |",
    ESG: "| ESG | 环境、社会与治理披露框架 |",
  };
  if (extra[app.acronym]) rows.push(extra[app.acronym]);
  return rows.join("\n");
}

function buildDocInfo(app) {
  return `## 文档信息

| 项目 | 内容 |
|------|------|
| 文档名称 | ${app.productNameFull}（${app.slug} Agent）V1.0 产品需求文档 |
| 产品名称 | ${app.productNameFull} |
| 版本号 | V1.0.0（规划初稿） |
| 编制人 | 产品经理 |
| 编制日期 | 2026-05-25 |
| 适用范围 | 基于 BuildingAI 平台，通过 AI Agent + MCP 实现${app.productNameFull}；规划对齐 \`extensions/ehcs-ai\` 模板 |

### 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| V1.0.0 | 2026-05-25 | ${app.productNameFull}规划初稿（母版：__EHCS_TEMPLATE__ 扩展） |

`;
}

function buildJsonExample(app) {
  return `{
  "ruleId": "${app.rulePrefix}_001",
  "businessDomain": "${app.businessDomains[0]}",
  "dataItem": "${app.businessDomains[0]}核心单据",
  "ruleDescription": "${app.businessDomains[0]}关键字段不得为空",
  "severity": "中",
  "autoFix": false
}`;
}

function buildJsonResponse(app) {
  return `{
  "ruleId": "${app.rulePrefix}_001",
  "anomalies": [
    {
      "anomalyId": "${app.rulePrefix}-20260525-001",
      "description": "${app.productName}业务记录不满足规则约束",
      "riskLevel": "中",
      "rootCauseAnalysis": "源系统录入缺失校验",
      "solution": "补全数据并增加前端必填",
      "status": "待解决",
      "autoFixed": false
    }
  ]
}`;
}

function transformPrd(template, app) {
  const mp = mcpPrefix(app.tablePrefix);
  const tp = app.tablePrefix;
  const slug = app.slug;
  const healthKpi = app.productName.replace(/自治$/, "") + "健康分";
  const batchLabel = app.triggerPhrase.includes("巡检") ? "巡检批次" : app.triggerPhrase.includes("分析") ? "分析批次" : "检查批次";
  let s = template;

  // Structural blocks first (before broad replacements)
  s = s.replace(/## 文档信息[\s\S]*?### 阅读指南/, buildDocInfo(app) + "### 阅读指南");

  const replacements = [
    [/ERP 数据健康自治系统（AI Agent 版）产品需求文档/g, `${app.productNameFull}（AI Agent 版）产品需求文档`],
    [/\*\*版本 V1\.1\.2（实现同步）\*\* · 产品需求 \+ 当前 BuildingAI 扩展实现说明/g, `**版本 V1.0.0（规划初稿）** · 产品需求 · 规划对齐 \`extensions/ehcs-ai\` 模板`],
    [/（绑定 EHCS 平台智能体）/g, `（绑定 ${app.agentName}）`],
    [/ehcs-ai/g, app.appId],
    [/EHCS-AI/g, slug],
    [/EHCS数据健康自治/g, app.agentName],
    [/ERP 数据健康自治系统/g, app.productNameFull],
    [/ehcs_ai/g, app.schema],
    [/ehcs-/g, tp],
    [/ehcs_/g, `${mp}_`],
    [/ehcs-mcp/g, "bowi-mcp"],
    [/ehcs_start_full_check/g, "bowi_start_full_check"],
    [/ehcs_get_check_progress/g, "bowi_get_check_progress"],
    [/ehcs_cancel_check/g, "bowi_cancel_check"],
    [/ehcs_ingest_rule_result/g, "bowi_ingest_rule_result"],
    [/ehcs_sql_query/g, "bowi_sql_query"],
    [/ehcs_sql_execute/g, "bowi_sql_execute"],
    [/ehcs-agent-dock-width/g, `${mp}-agent-dock-width`],
    [/ERP 数据质量管理/g, app.productNameFull.replace(/系统$/, "")],
    [/数据健康分/g, healthKpi],
    [/数据治理专员/g, `${app.productName}专员`],
    [/已实现于扩展 `[^`]+`/g, `规划对齐扩展 \`${app.appId}\`（V1.0 规划，参考 \`extensions/ehcs-ai\`）`],
    [/V1\.1 范围内（[^）]+）/g, `V1.0 规划范围内（扩展 \`${app.appId}\`）`],
    [/V1\.1 范围外/g, "V1.0 范围外"],
    [/无 EHCS 专用 MCP/g, `无 ${app.acronym} 专用 MCP`],
    [/对 EHCS 扩展库/g, `对 ${app.acronym} 扩展库`],
    [/对 EHCS 扩展表/g, `对 ${app.acronym} 扩展表`],
    [/docs\/UI-EHCS-AI\.html[^。]*/g, "规划阶段无独立 UI 原型，布局参考 EHCS 顶栏 + 右侧智能体栏"],
    [/docs\/DB-EHCS-AI\.md/g, `docs/DB-${slug}.md`],
    [/docs\/PRD-EHCS-AI\.md/g, `docs/PRD-${slug}.md`],
    [/extensions\/ehcs-ai\/src\/api\/db\/seed-data\/ehcs-platform-agent\.config\.ts/g, `extensions/${app.appId}/src/api/db/seed-data/${mp}-platform-agent.config.ts`],
    [/EhcsPlatformAgentSeeder/g, `${app.acronym}PlatformAgentSeeder`],
    [/EhcsCheckRulesCatalogSeeder/g, `${app.acronym}CheckRulesCatalogSeeder`],
    [/EhcsAiDataSeeder/g, `${app.acronym}AiDataSeeder`],
    [/财务数据 \/ 供应链数据 \/ 合作伙伴/g, app.businessDomains.join(" / ")],
    [/财务数据 \/ 供应链 \/ 合作伙伴/g, app.businessDomains.join(" / ")],
    [/100 − \(高风险数×10 \+ 中风险数×5 \+ 低风险数×2\)/g, app.healthScore],
    [/100 − \(高×10 \+ 中×5 \+ 低×2\)/g, app.healthScore],
    [/检查规则/g, app.rulesPageLabel],
    [/开始检查/g, app.triggerPhrase],
    [/全量检查/g, app.triggerPhrase.includes("分析") ? "全量分析" : app.triggerPhrase.includes("巡检") ? "全量巡检" : "全量检查"],
    [/「开始检查」/g, `「${app.triggerPhrase}」`],
    [/检查批次/g, batchLabel],
    [/检查规则/g, app.rulesPageLabel],
    [/更新 EHCS 智能体/g, `更新 ${app.agentName}`],
    [/创建\/更新 EHCS 智能体/g, `创建/更新 ${app.agentName}`],
    [/创建\/更新「EHCS数据健康自治」/g, `创建/更新「${app.agentName}」`],
    [/「EHCS数据健康自治」/g, `「${app.agentName}」`],
    [/\| \*\*V1\.1 \/ V1\.1\.1（当前）\*\*[\s\S]*?\| \*\*V2\.0\*\* \| 多 Agent 协同、模型自优化、全自动闭环 \|/g, `| **V1.0（规划）** | 扩展 \`${app.appId}\` 四页 + ${app.triggerPhrase} + RCA |
| **V1.1** | 定时巡检、专用 MCP 增强、修复确认流 |
| **V2.0** | 多 Agent 协同、模型自优化、全自动闭环 |`],
    [/\*文档结束[\s\S]*$/g, ""],
  ];

  for (const [re, rep] of replacements) {
    s = s.replace(re, rep);
  }

  // KPI block
  const kpiBlock = `| 规则总数 | 全部规则；副文案：已启用 / 禁用 |
| 待解决异常 | \`status=待解决\`；副文案：高风险条数 |
| ${app.kpiAlt[2]} | \`${app.healthScore}\`，仅计待解决；副文案：较昨日 Δ |
| 自动修复率 | \`auto_fixed\` 占比；副文案：已修复条数、较昨日 Δ |
| ${app.kpiAlt[4]} | 总批次数；副文案：今日批次数、运行中批次数 |
| ${app.kpiAlt[5]} | 总会话数；副文案：今日新建数 |`;
  s = s.replace(
    /\| 规则总数 \| 全部规则[\s\S]*?\| RCA 会话 \| 总会话数[^|]+\|/,
    kpiBlock,
  );

  // Appendix
  s = s.replace(
    /\| RULE_001 \| 财务数据[\s\S]*?\| RULE_002 \| 供应链数据[\s\S]*?\| 是 \|/,
    buildSampleRules(app),
  );
  s = s.replace(
    /\| ANOM-20260524-001 \| RULE_001[\s\S]*?\| ai自动修复 \|/,
    buildSampleAnomalies(app),
  );

  // Glossary
  s = s.replace(
    /\| EHCS \| ERP 数据健康[\s\S]*?\| 根因分析 \| 针对单条异常的多步交互推理诊断 \|/,
    buildGlossary(app),
  );

  // §1.4
  s = s.replace(
    /### 1\.4 产品边界\n/,
    `### 1.4 产品边界\n\n**自动修复边界：** ${app.autoFixPolicy}\n\n`,
  );

  // JSON examples §5.1
  s = s.replace(
    /```json\n\{\n  "ruleId": "RULE_001"[\s\S]*?\}\n```/,
    "```json\n" + buildJsonExample(app) + "\n```",
  );
  s = s.replace(
    /```json\n\{\n  "ruleId": "RULE_001",\n  "anomalies": \[[\s\S]*?\]\n\}\n```/,
    "```json\n" + buildJsonResponse(app) + "\n```",
  );

  // Footer appendix
  s = s.replace(
    /\| EHCS \| [^\n]+\|[\s\S]*?\| 根因分析 \| 针对单条异常的多步交互推理诊断 \|/,
    buildGlossary(app),
  );
  s = s.replace(/\| ERP 取数 \| 智能体已绑定的 \*\*MCP\*\*（非 EHCS 工具） \|/, `| ERP 取数 | 智能体已绑定的 **MCP**（非 ${app.acronym} 内置工具） |`);
  s = s.replace(/`RULE_001`/g, `\`${app.rulePrefix}_001\``);
  s = s.replace(/如 `RULE_001`/g, `如 \`${app.rulePrefix}_001\``);
  s = s.replace(/__EHCS_TEMPLATE__/g, "ehcs-ai");

  if (app.appId !== "ehcs-ai") {
    s = s.replace(new RegExp(`由 \`${app.appId}\` 托管`, "g"), "由 `ehcs-ai` 托管");
    s = s.replace(
      new RegExp(`/${app.appId}/consoleapi/bowi-mcp`, "g"),
      "/ehcs-ai/consoleapi/bowi-mcp",
    );
    s = s.replace(/（EHCS 为 `[^`]+`）/g, `（本应用为 \`${app.appId}\`）`);
  }

  s = s.trimEnd() + `

---

## 主要 ERP 实体（MCP 取数）

| DocType / 实体 | 用途 |
|----------------|------|
${buildErpTable(app)}

---

*文档结束 — ${slug} PRD V1.0.0*
`;

  return s;
}

function transformDb(template, app) {
  const mp = mcpPrefix(app.tablePrefix);
  const tp = app.tablePrefix;
  const slug = app.slug;
  let s = template;

  const replacements = [
    [/EHCS-AI 数据库表结构/g, `${slug} 数据库表结构`],
    [/ehcs-ai/g, app.appId],
    [/ehcs_ai/g, app.schema],
    [/ehcs-/g, tp],
    [/ehcs_/g, `${mp}_`],
    [/EHCS数据健康自治/g, app.agentName],
    [/EhcsPlatformAgentSeeder/g, `${app.acronym}PlatformAgentSeeder`],
    [/EhcsCheckRulesCatalogSeeder/g, `${app.acronym}CheckRulesCatalogSeeder`],
    [/EhcsAiDataSeeder/g, `${app.acronym}AiDataSeeder`],
    [/docs\/PRD-EHCS-AI\.md/g, `docs/PRD-${slug}.md`],
    [/docs\/DB-EHCS-AI\.md/g, `docs/DB-${slug}.md`],
    [/extensions\/ehcs-ai/g, `extensions/${app.appId}`],
    [/ehcs-table-names\.ts/g, `${mp}-table-names.ts`],
    [/ehcs-check-rules-catalog\.ts/g, `${mp}-check-rules-catalog.ts`],
    [/pnpm --filter ehcs-ai/g, `pnpm --filter ${app.appId}`],
    [/RULE_001–`RULE_035`/g, `${app.rulePrefix}_001–${app.rulePrefix}_${String(app.seedRuleCount).padStart(3, "0")}`],
    [/\*\*35\*\* 条检查规则/g, `**${app.seedRuleCount}** 条检查规则`],
    [/财务数据 \/ 供应链数据 \/ 合作伙伴 等/g, `${app.businessDomains.join(" / ")} 等`],
    [/openspec\/specs\/ehcs-ai-data-model\/spec\.md/g, `openspec/specs/${app.appId}-data-model/spec.md（待实现）`],
    [/所有 EHCS 业务表/g, `所有 ${app.acronym} 业务表`],
    [/绑定 EHCS 使用的/g, `绑定 ${app.productName} 使用的`],
    [/更新 EHCS 智能体/g, `更新 ${app.agentName}`],
    [/ehcs-mcp 工具/g, "bowi-mcp 工具（ehcs-ai 托管，调用须传 appId）"],
    [/无 \$\{app\.acronym\} 专用 MCP/g, "共用 bowi-mcp（须传 appId）"],
    [/最后同步：[^\n]+/g, `最后同步：2026-05-25（V1.0.0 规划初稿）`],
  ];

  for (const [re, rep] of replacements) {
    s = s.replace(re, rep);
  }

  s = s.replace(
    /\| 文件 \| 说明 \|[\s\S]*?> 基线表结构/,
    `| 文件 | 说明 |
|------|------|
| \`0.1.0-baseline.ts\` | 规划基线：6 张核心表（synchronize 建表） |

> 基线表结构`,
  );

  s += buildExtensionSection(app);

  const ruleEnd = String(app.seedRuleCount).padStart(3, "0");
  s = s.replace(/`RULE_001`/g, `\`${app.rulePrefix}_001\``);
  s = s.replace(/RULE_001–`RULE_035`/g, `${app.rulePrefix}_001–${app.rulePrefix}_${ruleEnd}`);
  s = s.replace(/RULE_001–RULE_035/g, `${app.rulePrefix}_001–${app.rulePrefix}_${ruleEnd}`);
  s = s.replace(/EHCS 通过/g, `${app.acronym} 通过`);

  return s;
}

function main() {
  const prdTemplate = fs.readFileSync(path.join(DOCS, "PRD-EHCS-AI.md"), "utf8");
  const dbTemplate = fs.readFileSync(path.join(DOCS, "DB-EHCS-AI.md"), "utf8");
  const filter = process.argv[2];

  for (const app of registry.apps) {
    if (filter && app.appId !== filter) continue;
    fs.writeFileSync(path.join(DOCS, `PRD-${app.slug}.md`), transformPrd(prdTemplate, app), "utf8");
    fs.writeFileSync(path.join(DOCS, `DB-${app.slug}.md`), transformDb(dbTemplate, app), "utf8");
    console.log(`OK ${app.slug}`);
  }
}

main();
