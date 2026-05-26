#!/usr/bin/env node
/**
 * Seed platform agents for all 20 enterprise apps (plus optional ehcs-ai).
 *
 * Usage (repo root, Node 22+, after each extension build:api):
 *   node scripts/enterprise-ai-apps/seed-all-platform-agents.mjs
 *   node scripts/enterprise-ai-apps/seed-all-platform-agents.mjs inv-opt-ai
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadRegistry, pascalFromAppId, ROOT } from "./registry.mjs";
import {
    createPlatformAgentDataSource,
    runPlatformAgentSeeder,
} from "./platform-agent-seed-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

function seederNameForApp(appId) {
    return `${pascalFromAppId(appId)}PlatformAgentSeeder`;
}

async function seedOne(dataSource, appId) {
    const extDir = path.join(ROOT, "extensions", appId);
    const seedsIndex = path.join(extDir, "build/db/seeds/index.js");
    const seederName = seederNameForApp(appId);
    await runPlatformAgentSeeder(dataSource, seedsIndex, seederName);
    console.log(`OK ${appId} (${seederName})`);
}

async function main() {
    const filter = process.argv[2];
    const { apps } = loadRegistry();
    const appIds = filter ? [filter] : ["ehcs-ai", ...apps.map((a) => a.appId)];

    const dataSource = await createPlatformAgentDataSource(ROOT);
    await dataSource.initialize();

    let ok = 0;
    let fail = 0;
    try {
        for (const appId of appIds) {
            try {
                await seedOne(dataSource, appId);
                ok++;
            } catch (err) {
                fail++;
                console.error(`FAIL ${appId}:`, err instanceof Error ? err.message : err);
            }
        }
    } finally {
        await dataSource.destroy();
    }
    console.log(`SUMMARY ok=${ok} fail=${fail}`);
    if (fail > 0) process.exit(1);
}

main();
