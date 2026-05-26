#!/usr/bin/env node
/**
 * Apply BowiAI Agent platform branding to site webinfo (sidebar logo + name).
 *
 * Usage: node scripts/enterprise-ai-apps/sync-bowi-platform-branding.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOWI_AGENT_PLATFORM } from "./agent-branding.mjs";
import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";
import { ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const WEBINFO = {
    name: BOWI_AGENT_PLATFORM.name,
    description: BOWI_AGENT_PLATFORM.name,
    logo: BOWI_AGENT_PLATFORM.avatar,
    icon: BOWI_AGENT_PLATFORM.avatar,
};

async function upsertWebinfo(ds, key, value) {
    const rows = await ds.query(
        `SELECT id FROM config WHERE key = $1 AND "group" = 'webinfo' LIMIT 1`,
        [key],
    );
    const stored = typeof value === "string" ? value : JSON.stringify(value);
    if (rows.length > 0) {
        await ds.query(
            `UPDATE config SET value = $1, updated_at = NOW(), is_enabled = true WHERE id = $2`,
            [stored, rows[0].id],
        );
        console.log(`Updated webinfo.${key}`);
    } else {
        await ds.query(
            `INSERT INTO config (id, key, value, "group", description, sort, is_enabled, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, 'webinfo', $3, 0, true, NOW(), NOW())`,
            [key, stored, `网站 webinfo 配置 - ${key}`],
        );
        console.log(`Inserted webinfo.${key}`);
    }
}

async function main() {
    const logoPath = path.join(ROOT, "storage/static/avatars/bowiai-agent-platform.svg");
    const fs = await import("node:fs");
    if (!fs.existsSync(logoPath)) {
        throw new Error(`Missing ${logoPath}. Run generate-agent-avatars or add the SVG first.`);
    }

    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();
    for (const [key, value] of Object.entries(WEBINFO)) {
        await upsertWebinfo(ds, key, value);
    }
    await ds.destroy();
    console.log(`Done. Refresh browser (hard reload) to see "${BOWI_AGENT_PLATFORM.name}" logo.`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
