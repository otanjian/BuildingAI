#!/usr/bin/env node
/**
 * Register or migrate MCP server to bowi-mcp and sync 6 tools into ai_mcp_tool.
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";
import { ROOT } from "./registry.mjs";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const { BOWI_MCP_SERVER_NAME, BOWI_MCP_TOOL_CATALOG, getBowiMcpPublicUrl } = require(
    path.join(ROOT, "packages/@buildingai/constants/dist/shared/bowi-mcp.constant.js"),
);

async function main() {
    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();

    const url = getBowiMcpPublicUrl();
    const adminRow = await ds.query(
        `SELECT id FROM "user" WHERE is_root = '1' ORDER BY created_at ASC LIMIT 1`,
    );
    const creatorId = adminRow[0]?.id ?? null;

    const legacy = await ds.query(
        `SELECT id FROM ai_mcp_servers WHERE name IN ('ehcs-mcp', $1) ORDER BY CASE WHEN name = $1 THEN 0 ELSE 1 END LIMIT 1`,
        [BOWI_MCP_SERVER_NAME],
    );

    let serverId;
    if (legacy.length > 0) {
        serverId = legacy[0].id;
        await ds.query(
            `UPDATE ai_mcp_servers SET name = $1, alias = $2, url = $3, type = 'system', communication_type = 'streamable-http',
             is_disabled = false, connectable = true, connect_error = '', creator_id = COALESCE(creator_id, $5),
             updated_at = NOW() WHERE id = $4`,
            [BOWI_MCP_SERVER_NAME, "BowiAI MCP", url, serverId, creatorId],
        );
        console.log(`Updated MCP server ${serverId} → ${BOWI_MCP_SERVER_NAME}`);
    } else {
        const inserted = await ds.query(
            `INSERT INTO ai_mcp_servers (id, name, alias, url, type, communication_type, is_disabled, connectable, creator_id, sort_order, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, 'system', 'streamable-http', false, true, $4, 0, NOW(), NOW())
             RETURNING id`,
            [BOWI_MCP_SERVER_NAME, "BowiAI MCP", url, creatorId],
        );
        serverId = inserted[0].id;
        console.log(`Created MCP server ${BOWI_MCP_SERVER_NAME} (${serverId})`);
    }

    const existing = await ds.query(
        `SELECT id, name FROM ai_mcp_tool WHERE mcp_server_id = $1`,
        [serverId],
    );
    const byName = new Map(existing.map((r) => [r.name, r.id]));
    const catalogNames = new Set(BOWI_MCP_TOOL_CATALOG.map((t) => t.name));

    for (const tool of BOWI_MCP_TOOL_CATALOG) {
        const schema = JSON.stringify(tool.inputSchema);
        if (byName.has(tool.name)) {
            await ds.query(
                `UPDATE ai_mcp_tool SET description = $1, input_schema = $2::jsonb, updated_at = NOW() WHERE id = $3`,
                [tool.description, schema, byName.get(tool.name)],
            );
        } else {
            await ds.query(
                `INSERT INTO ai_mcp_tool (id, mcp_server_id, name, description, input_schema, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, NOW(), NOW())`,
                [serverId, tool.name, tool.description, schema],
            );
        }
    }

    for (const row of existing) {
        if (!catalogNames.has(row.name)) {
            await ds.query(`DELETE FROM ai_mcp_tool WHERE id = $1`, [row.id]);
        }
    }

    const count = await ds.query(
        `SELECT COUNT(*)::int AS c FROM ai_mcp_tool WHERE mcp_server_id = $1`,
        [serverId],
    );
    console.log(`Synced ${count[0].c} tools for ${BOWI_MCP_SERVER_NAME}`);

    // System MCP must be enabled per-user (ai_user_mcp_server) to appear in agent tool picker.
    const users = await ds.query(`SELECT DISTINCT user_id FROM ai_user_mcp_server`);
    let linked = 0;
    for (const { user_id } of users) {
        const row = await ds.query(
            `SELECT id, is_disabled FROM ai_user_mcp_server WHERE user_id = $1 AND mcp_server_id = $2`,
            [user_id, serverId],
        );
        if (row.length === 0) {
            await ds.query(
                `INSERT INTO ai_user_mcp_server (id, user_id, mcp_server_id, is_disabled, created_at, updated_at)
                 VALUES (gen_random_uuid(), $1, $2, false, NOW(), NOW())`,
                [user_id, serverId],
            );
            linked++;
        } else if (row[0].is_disabled) {
            await ds.query(
                `UPDATE ai_user_mcp_server SET is_disabled = false, updated_at = NOW() WHERE id = $1`,
                [row[0].id],
            );
            linked++;
        }
    }
    if (linked > 0) {
        console.log(`Enabled ${BOWI_MCP_SERVER_NAME} for ${linked} user(s) in agent tool picker`);
    }

    await ds.destroy();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
