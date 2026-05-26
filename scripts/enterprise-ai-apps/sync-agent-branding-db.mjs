#!/usr/bin/env node
/**
 * Update existing platform agent rows (description + avatar) without re-seeding MCP bindings.
 *
 * Usage: node scripts/enterprise-ai-apps/sync-agent-branding-db.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { agentAvatarPath, buildAgentDescription } from "./agent-branding.mjs";
import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";
import { loadRegistry, ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const EHCS_AGENT = {
    appId: "ehcs-ai",
    agentName: "EHCS数据健康自治",
    productName: "数据健康自治",
    triggerPhrase: "开始检查",
};

async function main() {
    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();
    const targets = [
        EHCS_AGENT,
        ...loadRegistry().apps.map((a) => ({
            appId: a.appId,
            agentName: a.agentName,
            productName: a.productName,
            triggerPhrase: a.triggerPhrase,
        })),
    ];
    let updated = 0;
    for (const t of targets) {
        const rows = await ds.query(
            `UPDATE ai_agent SET description = $1, avatar = $2, updated_at = NOW()
             WHERE name = $3 RETURNING id`,
            [
                buildAgentDescription(t),
                agentAvatarPath(t.appId),
                t.agentName,
            ],
        );
        if (rows.length > 0) {
            updated += rows.length;
            console.log(`Updated ${t.agentName} (${rows[0].id})`);
        } else {
            console.log(`Skip (not found): ${t.agentName}`);
        }
    }
    await ds.destroy();
    console.log(`Done. updated=${updated}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
