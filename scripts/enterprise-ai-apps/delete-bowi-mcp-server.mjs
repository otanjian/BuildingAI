#!/usr/bin/env node
/**
 * Remove bowi-mcp (and legacy ehcs-mcp) from platform DB so you can re-import via MCP JSON.
 *
 * Usage: node scripts/enterprise-ai-apps/delete-bowi-mcp-server.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "url";

import { BOWI_MCP_SERVER_NAME } from "@buildingai/constants/shared/bowi-mcp.constant";
import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";
import { ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const LEGACY_NAMES = [BOWI_MCP_SERVER_NAME, "bowiai-mcp", "ehcs-mcp"];

function toSimpleArray(ids) {
    return ids.filter(Boolean).join(",");
}

function parseSimpleArray(raw) {
    if (!raw || typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch {
            /* fall through */
        }
    }
    return trimmed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

async function main() {
    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();

    const servers = await ds.query(
        `SELECT id, name FROM ai_mcp_servers WHERE name = ANY($1::text[])`,
        [LEGACY_NAMES],
    );
    if (servers.length === 0) {
        console.log("No bowi-mcp / ehcs-mcp server rows found. Nothing to delete.");
        await ds.destroy();
        return;
    }

    const removeIds = new Set(servers.map((s) => s.id));
    console.log(
        "Deleting MCP servers:",
        servers.map((s) => `${s.name} (${s.id})`).join(", "),
    );

    const agents = await ds.query(`SELECT id, name, mcp_server_ids FROM ai_agent`);
    let agentsUpdated = 0;
    for (const agent of agents) {
        const ids = parseSimpleArray(agent.mcp_server_ids).filter((id) => !removeIds.has(id));
        const next = toSimpleArray(ids);
        const prev = agent.mcp_server_ids ?? "";
        if (next !== prev) {
            await ds.query(
                `UPDATE ai_agent SET mcp_server_ids = $1, updated_at = NOW() WHERE id = $2`,
                [next || null, agent.id],
            );
            agentsUpdated++;
        }
    }

    for (const server of servers) {
        const toolDel = await ds.query(
            `DELETE FROM ai_mcp_tool WHERE mcp_server_id = $1`,
            [server.id],
        );
        const userDel = await ds.query(
            `DELETE FROM ai_user_mcp_server WHERE mcp_server_id = $1`,
            [server.id],
        );
        await ds.query(`DELETE FROM ai_mcp_servers WHERE id = $1`, [server.id]);
        console.log(
            `Removed ${server.name}: tools=${toolDel.length ?? 0}, user_links=${userDel.length ?? 0}`,
        );
    }

    await ds.destroy();
    console.log(`Done. agents_updated=${agentsUpdated}`);
    console.log("Re-import bowi-mcp via 工作空间 → MCP → 从 JSON 导入, then 检测连接.");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
