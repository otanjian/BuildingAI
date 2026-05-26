#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, pascalFromAppId, ROOT } from "./registry.mjs";
import { buildRulesForApp } from "./rule-templates.mjs";

function emitCatalog(app, rules) {
    const pascal = pascalFromAppId(app.appId);
    const constPrefix = app.acronym;
    const marker = rules[rules.length - 1].ruleId;
    const lines = rules.map((r) => {
        const auto = r.autoFix ? "\n        autoFix: true," : "";
        return `    {
        ruleId: "${r.ruleId}",
        businessDomain: "${r.businessDomain}",
        dataItem: "${r.dataItem}",
        ruleDescription:
            "${r.ruleDescription.replace(/"/g, '\\"')}",
        deductScore: ${r.deductScore},
        severity: "${r.severity}",${auto}
    },`;
    });

    return `/** Catalog version — bump when rule set changes. */
export const ${constPrefix}_CHECK_RULES_CATALOG_VERSION = "2026-05-25";

export type ${pascal}CheckRuleCatalogEntry = {
    ruleId: string;
    businessDomain: string;
    dataItem: string;
    ruleDescription: string;
    deductScore: number;
    severity: "高" | "中" | "低";
    autoFix?: boolean;
    enabled?: boolean;
};

export const ${constPrefix}_CHECK_RULES_CATALOG: ${pascal}CheckRuleCatalogEntry[] = [
${lines.join("\n")}
];

export const ${constPrefix}_CATALOG_MARKER_RULE_ID = "${marker}";
`;
}

function updateSeederMarker(app, marker) {
    const pascal = pascalFromAppId(app.appId);
    const prefix = app.tablePrefix.replace(/-$/, "");
    const seederPath = path.join(
        ROOT,
        "extensions",
        app.appId,
        "src/api/db/seeds/seeders",
        `${prefix}-check-rules-catalog.seeder.ts`,
    );
    if (!fs.existsSync(seederPath)) {
        const alt = fs.readdirSync(path.dirname(seederPath)).find((f) => f.includes("check-rules-catalog"));
        if (!alt) return;
        const p = path.join(path.dirname(seederPath), alt);
        let s = fs.readFileSync(p, "utf8");
        s = s.replace(/CATALOG_MARKER_RULE_ID = "[^"]+"/, `CATALOG_MARKER_RULE_ID = "${marker}"`);
        s = s.replace(/ruleId: "RULE_001"/, `ruleId: "${app.rulePrefix}_001"`);
        fs.writeFileSync(p, s, "utf8");
        return;
    }
    let s = fs.readFileSync(seederPath, "utf8");
    s = s.replace(/CATALOG_MARKER_RULE_ID = "[^"]+"/, `CATALOG_MARKER_RULE_ID = "${marker}"`);
    s = s.replace(/ruleId: "RULE_001"/, `ruleId: "${app.rulePrefix}_001"`);
    fs.writeFileSync(seederPath, s, "utf8");
}

function main() {
    const data = loadRegistry();
    const filter = process.argv[2];
    for (const app of data.apps) {
        if (filter && app.appId !== filter) continue;
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) {
            console.warn(`Missing extension ${app.appId}, run scaffold first`);
            continue;
        }
        const rules = buildRulesForApp(app);
        const prefix = app.tablePrefix.replace(/-$/, "");
        const outDir = path.join(extDir, "src/api/db/seed-data");
        fs.mkdirSync(outDir, { recursive: true });
        const outFile = path.join(outDir, `${prefix}-check-rules-catalog.ts`);
        fs.writeFileSync(outFile, emitCatalog(app, rules), "utf8");
        updateSeederMarker(app, rules[rules.length - 1].ruleId);
        console.log(`${app.appId}: ${rules.length} rules -> ${outFile}`);
    }
}

main();
