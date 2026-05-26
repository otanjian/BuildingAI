#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, ROOT } from "./registry.mjs";

const MIN_RULES = 30;

function countRulesInFile(filePath) {
    const text = fs.readFileSync(filePath, "utf8");
    const matches = text.match(/ruleId:\s*"/g);
    return matches ? matches.length : 0;
}

function main() {
    const data = loadRegistry();
    let failed = false;
    for (const app of data.apps) {
        const prefix = app.tablePrefix.replace(/-$/, "");
        const catalogPath = path.join(
            ROOT,
            "extensions",
            app.appId,
            "src/api/db/seed-data",
            `${prefix}-check-rules-catalog.ts`,
        );
        if (!fs.existsSync(catalogPath)) {
            console.error(`MISSING ${app.appId}: ${catalogPath}`);
            failed = true;
            continue;
        }
        const count = countRulesInFile(catalogPath);
        if (count < MIN_RULES) {
            console.error(`FAIL ${app.appId}: ${count} rules (need >= ${MIN_RULES})`);
            failed = true;
        } else {
            console.log(`OK ${app.appId}: ${count} rules`);
        }
    }
    process.exit(failed ? 1 : 0);
}

main();
