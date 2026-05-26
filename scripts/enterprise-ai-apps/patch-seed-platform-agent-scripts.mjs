#!/usr/bin/env node
// Rewrite each extension scripts/seed-platform-agent.mjs to use platform-agent-seed-lib.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pascalFromAppId, ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function scriptFor(appId) {
    const pascal = pascalFromAppId(appId);
    const seederName = `${pascal}PlatformAgentSeeder`;
    const acronym = appId.replace(/-ai$/, "").toUpperCase().replace(/-/g, "_");
    return `/**
 * Create ${acronym} platform agent on an existing install.
 *
 * Usage (from repo root, after \`pnpm --filter ${appId} build:api\`):
 *   pnpm --filter ${appId} seed:agent
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    createPlatformAgentDataSource,
    runPlatformAgentSeeder,
} from "../../../scripts/enterprise-ai-apps/platform-agent-seed-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const appId = path.basename(path.resolve(__dirname, ".."));
config({ path: path.join(rootDir, ".env") });

const seedsIndex = path.join(__dirname, "../build/db/seeds/index.js");
const seederName = "${seederName}";

const dataSource = await createPlatformAgentDataSource(rootDir);
await dataSource.initialize();
try {
    await runPlatformAgentSeeder(dataSource, seedsIndex, seederName);
} catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error("Run: pnpm --filter", appId, "build:api");
    process.exit(1);
} finally {
    await dataSource.destroy();
}

console.log(\`Done. Open \${appId} → Settings to verify agent "\${seederName}".\`);
`;
}

const extensionsDir = path.join(ROOT, "extensions");
for (const appId of fs.readdirSync(extensionsDir)) {
    const scriptPath = path.join(extensionsDir, appId, "scripts/seed-platform-agent.mjs");
    if (!fs.existsSync(scriptPath)) continue;
    fs.writeFileSync(scriptPath, scriptFor(appId), "utf8");
    console.log("patched", appId);
}
