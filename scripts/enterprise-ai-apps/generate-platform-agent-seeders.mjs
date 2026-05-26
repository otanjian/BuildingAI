#!/usr/bin/env node
/**
 * Regenerate *-platform-agent.seeder.ts from ehcs template (bowi model + square publish).
 */
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, pascalFromAppId, ROOT } from "./registry.mjs";

const templatePath = path.join(
    ROOT,
    "extensions/ehcs-ai/src/api/db/seeds/seeders/ehcs-platform-agent.seeder.ts",
);
const template = fs.readFileSync(templatePath, "utf8");

function tableModule(app) {
    const mp = app.tablePrefix.replace(/-$/, "");
    return `${mp}-table-names`;
}

function transform(app) {
    const pascal = pascalFromAppId(app.appId);
    const acronym = app.acronym;
    const mp = app.tablePrefix.replace(/-$/, "");
    const schemaConst = `${acronym}_AI_SCHEMA`;
    const tableConst = `${acronym}_TABLE`;

    const pairs = [
        ["EhcsPlatformAgentSeeder", `${pascal}PlatformAgentSeeder`],
        ["ehcs-platform-agent.seeder", `${mp}-platform-agent.seeder`],
        ["ehcs-table-names", tableModule(app)],
        ["EHCS_AI_SCHEMA", schemaConst],
        ["EHCS_TABLE", tableConst],
        ["EHCS_", `${acronym}_`],
        ["Ehcs", pascal],
        ["ehcs_ai", app.schema],
        ["ehcs-", app.tablePrefix],
        ["EHCS agent", `${acronym} agent`],
        ["EHCS agent", `${acronym} agent`],
        ["seeding EHCS", `seeding ${acronym}`],
        ["linkAgentToEhcsSettings", `linkAgentTo${pascal}Settings`],
        ["EHCS_ERP_MCP_NAME_HINTS", `${acronym}_ERP_MCP_NAME_HINTS`],
    ].sort((a, b) => b[0].length - a[0].length);

    let out = template;
    for (const [a, b] of pairs) out = out.split(a).join(b);
    return out;
}

const { apps } = loadRegistry();
for (const app of apps) {
    const mp = app.tablePrefix.replace(/-$/, "");
    const outPath = path.join(
        ROOT,
        "extensions",
        app.appId,
        "src/api/db/seeds/seeders",
        `${mp}-platform-agent.seeder.ts`,
    );
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, transform(app), "utf8");
    console.log(`Seeder: ${outPath}`);
}
console.log("Done.");
