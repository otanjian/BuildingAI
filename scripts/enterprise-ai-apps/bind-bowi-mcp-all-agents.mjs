#!/usr/bin/env node
/**
 * Bind bowi-mcp + ERP MCP on every enterprise platform agent (ai_agent.mcp_server_ids).
 *
 * Prerequisite: bowi-mcp row exists (EHCS 设置 →「更新智能体」once).
 *
 * Usage: node scripts/enterprise-ai-apps/bind-bowi-mcp-all-agents.mjs
 */
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BOWI_MCP_SERVER_NAME } from "@buildingai/constants/shared/bowi-mcp.constant";
import { loadRegistry, ROOT } from "./registry.mjs";
import { createPlatformAgentDataSource } from "./platform-agent-seed-lib.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const ERP_HINTS = ["erpnext", "erp-next", "erp", "sap"];

const AGENT_NAMES = [
    "EHCS数据健康自治",
    ...loadRegistry().apps.map((a) => a.agentName),
];

async function resolveMcpIds(ds) {
    const servers = await ds.query(
        `SELECT id, name, alias FROM ai_mcp_servers WHERE is_disabled = false ORDER BY created_at ASC`,
    );
    const lower = (s) => String(s ?? "").toLowerCase();
    const bowi = servers.find(
        (s) =>
            lower(s.name) === BOWI_MCP_SERVER_NAME ||
            lower(s.name).includes("bowi-mcp"),
    );
    const erpCandidates = servers.filter(
        (s) =>
            lower(s.name) !== BOWI_MCP_SERVER_NAME &&
            !lower(s.name).includes("bowi-mcp"),
    );
    let erp = null;
    for (const hint of ERP_HINTS) {
        erp = erpCandidates.find(
            (s) =>
                lower(s.name).includes(hint) ||
                (s.alias && lower(s.alias).includes(hint)),
        );
        if (erp) break;
    }
    if (!erp && erpCandidates.length > 0) erp = erpCandidates[0];
    if (!bowi?.id) {
        throw new Error(
            `MCP "${BOWI_MCP_SERVER_NAME}" not found. Open EHCS settings →「更新智能体」to register bowi-mcp first.`,
        );
    }
    return {
        bowiId: bowi.id,
        erpId: erp?.id ?? null,
        bowiName: bowi.name,
        erpName: erp?.name ?? null,
    };
}

async function main() {
    const ds = await createPlatformAgentDataSource(ROOT);
    await ds.initialize();
    const { bowiId, erpId, bowiName, erpName } = await resolveMcpIds(ds);
    const mcpIds = [bowiId, ...(erpId ? [erpId] : [])].join(",");

    let ok = 0;
    let skip = 0;
    for (const name of AGENT_NAMES) {
        const rows = await ds.query(
            `UPDATE ai_agent SET mcp_server_ids = $1, updated_at = NOW()
             WHERE name = $2 RETURNING id`,
            [mcpIds || null, name],
        );
        if (rows.length === 0) {
            console.log(`Skip (no agent): ${name}`);
            skip++;
            continue;
        }
        console.log(`OK ${name}: ${bowiName}${erpName ? ` + ${erpName}` : ""}`);
        ok++;
    }
    await ds.destroy();
    console.log(`Done. bound=${ok} skip=${skip}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
