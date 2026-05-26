/**
 * Create TAX_COMPLIANCE platform agent on an existing install.
 *
 * Usage (from repo root, after `pnpm --filter tax-compliance-ai build:api`):
 *   pnpm --filter tax-compliance-ai seed:agent
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
const seederName = "TaxCompliancePlatformAgentSeeder";

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

console.log(`Done. Open ${appId} → Settings to verify agent "${seederName}".`);
