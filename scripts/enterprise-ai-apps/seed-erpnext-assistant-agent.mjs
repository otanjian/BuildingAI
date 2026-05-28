#!/usr/bin/env node
/**
 * Seed or update the ERPNext system assistant platform agent (ERP MCP only).
 *
 * Usage (repo root):
 *   node scripts/enterprise-ai-apps/seed-erpnext-assistant-agent.mjs
 */
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
    ERPNEXT_ASSISTANT_AGENT_AVATAR,
    ERPNEXT_ASSISTANT_AGENT_DESCRIPTION,
    ERPNEXT_ASSISTANT_AGENT_NAME,
    ERPNEXT_ASSISTANT_FORM_FIELDS,
    ERPNEXT_ASSISTANT_MAX_STEPS,
    ERPNEXT_ASSISTANT_OPENING_QUESTIONS,
    ERPNEXT_ASSISTANT_OPENING_STATEMENT,
    ERPNEXT_ASSISTANT_QUICK_COMMANDS,
    ERPNEXT_ASSISTANT_ROLE_PROMPT,
    ERPNEXT_ERP_MCP_NAME_HINTS,
} from "./erpnext-assistant-agent.config.mjs";
import { ROOT } from "./registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(ROOT, ".env") });

const require = createRequire(path.join(ROOT, "packages/@buildingai/db/package.json"));
const { Pool } = require("pg");

function createDb() {
    const pool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "buildingai",
    });
    return {
        query: (text, params) => pool.query(text, params).then((res) => res.rows),
        end: () => pool.end(),
    };
}

const BOWI_MCP_SERVER_NAME = "bowi-mcp";
const LLM_MODEL_NAME = "ark-code-latest";

function buildModelConfig(modelId) {
    const options = { temperature: 0.3, maxTokens: 8192 };
    const ref = { modelId, options };
    return {
        modelConfig: { id: modelId, options },
        modelRouting: {
            memoryModel: ref,
            planningModel: ref,
            titleModel: ref,
        },
    };
}

function isBowiMcp(name, alias) {
    const lower = (s) => s.toLowerCase();
    return (
        lower(name) === BOWI_MCP_SERVER_NAME ||
        lower(name).includes("bowi-mcp") ||
        lower(name).includes("bowiai-mcp") ||
        (alias && (lower(alias).includes("bowi-mcp") || lower(alias).includes("bowiai-mcp")))
    );
}

async function resolveErpMcpId(ds) {
    const rows = await ds.query(
        `SELECT id, name, alias FROM ai_mcp_servers WHERE is_disabled = false ORDER BY created_at ASC`,
    );
    const erpCandidates = rows.filter((r) => !isBowiMcp(r.name, r.alias));
    const lower = (s) => s.toLowerCase();
    for (const hint of ERPNEXT_ERP_MCP_NAME_HINTS) {
        const match = erpCandidates.find(
            (s) =>
                lower(s.name).includes(hint) ||
                (s.alias && lower(s.alias).includes(hint)),
        );
        if (match) return match.id;
    }
    if (erpCandidates.length > 0) return erpCandidates[0].id;
    throw new Error(
        `No ERP MCP server found (hints: ${ERPNEXT_ERP_MCP_NAME_HINTS.join(", ")}). Register ERPnext-west first.`,
    );
}

async function resolveLlmModelId(ds) {
    const byName = await ds.query(
        `SELECT id FROM ai_models WHERE is_active = true AND model_type = 'llm' AND model = $1 LIMIT 1`,
        [LLM_MODEL_NAME],
    );
    if (byName[0]?.id) return byName[0].id;
    const fallback = await ds.query(
        `SELECT id FROM ai_models WHERE is_active = true AND model_type = 'llm' ORDER BY created_at ASC LIMIT 1`,
    );
    if (fallback[0]?.id) return fallback[0].id;
    throw new Error(`No active LLM model found; enable ${LLM_MODEL_NAME} in console first`);
}

async function resolveOwnerId(ds) {
    const rows = await ds.query(`SELECT id FROM "user" ORDER BY created_at ASC LIMIT 1`);
    if (!rows[0]?.id) throw new Error("No user found; create a platform user first");
    return rows[0].id;
}

function agentPayload(modelId, mcpId, ownerId, accessToken) {
    const { modelConfig, modelRouting } = buildModelConfig(modelId);
    return {
        description: ERPNEXT_ASSISTANT_AGENT_DESCRIPTION,
        avatar: ERPNEXT_ASSISTANT_AGENT_AVATAR,
        rolePrompt: ERPNEXT_ASSISTANT_ROLE_PROMPT,
        openingStatement: ERPNEXT_ASSISTANT_OPENING_STATEMENT,
        openingQuestions: ERPNEXT_ASSISTANT_OPENING_QUESTIONS,
        quickCommands: ERPNEXT_ASSISTANT_QUICK_COMMANDS,
        formFields: ERPNEXT_ASSISTANT_FORM_FIELDS,
        maxSteps: ERPNEXT_ASSISTANT_MAX_STEPS,
        modelConfig,
        modelRouting,
        toolConfig: { requireApproval: false, toolTimeout: 30000 },
        memoryConfig: { maxUserMemories: 20, maxAgentMemories: 20 },
        autoQuestions: { enabled: false, customRuleEnabled: false, customRule: "" },
        mcpServerIds: mcpId,
        publishConfig: { enableSite: true, accessToken },
        createBy: ownerId,
    };
}

async function upsertAgent(ds, payload) {
    const existing = await ds.query(`SELECT id, publish_config FROM ai_agent WHERE name = $1 LIMIT 1`, [
        ERPNEXT_ASSISTANT_AGENT_NAME,
    ]);

    const accessToken =
        existing[0]?.publish_config?.accessToken ?? randomBytes(32).toString("hex");
    const full = agentPayload(payload.modelId, payload.mcpId, payload.ownerId, accessToken);

    if (existing[0]?.id) {
        await ds.query(
            `UPDATE ai_agent SET
                description = $1,
                avatar = $2,
                role_prompt = $3,
                opening_statement = $4,
                opening_questions = $5::json,
                quick_commands = $6::json,
                form_fields = $7::json,
                max_steps = $8,
                model_config = $9::json,
                model_routing = $10::json,
                tool_config = $11::json,
                memory_config = $12::json,
                auto_questions = $13::json,
                mcp_server_ids = $14,
                publish_config = $15::json,
                show_context = true,
                show_reference = true,
                enable_web_search = false,
                enable_file_upload = false,
                chat_avatar_enabled = false,
                voice_config = NULL,
                published_to_square = true,
                square_publish_status = 'approved',
                published_at = COALESCE(published_at, NOW()),
                updated_at = NOW()
             WHERE id = $16`,
            [
                full.description,
                full.avatar,
                full.rolePrompt,
                full.openingStatement,
                JSON.stringify(full.openingQuestions),
                JSON.stringify(full.quickCommands),
                JSON.stringify(full.formFields),
                full.maxSteps,
                JSON.stringify(full.modelConfig),
                JSON.stringify(full.modelRouting),
                JSON.stringify(full.toolConfig),
                JSON.stringify(full.memoryConfig),
                JSON.stringify(full.autoQuestions),
                full.mcpServerIds,
                JSON.stringify(full.publishConfig),
                existing[0].id,
            ],
        );
        return { id: existing[0].id, accessToken, created: false };
    }

    const inserted = await ds.query(
        `INSERT INTO ai_agent (
            name, create_mode, description, avatar, role_prompt,
            show_context, show_reference, enable_web_search, enable_file_upload, chat_avatar_enabled,
            model_config, model_routing, tool_config, memory_config, max_steps,
            opening_statement, opening_questions, quick_commands, auto_questions, form_fields,
            mcp_server_ids, user_count, publish_config, create_by,
            published_to_square, square_publish_status, published_at,
            created_at, updated_at
        ) VALUES (
            $1, 'direct', $2, $3, $4,
            true, true, false, false, false,
            $5::json, $6::json, $7::json, $8::json, $9,
            $10, $11::json, $12::json, $13::json, $14::json,
            $15, 0, $16::json, $17,
            true, 'approved', NOW(),
            NOW(), NOW()
        ) RETURNING id`,
        [
            ERPNEXT_ASSISTANT_AGENT_NAME,
            full.description,
            full.avatar,
            full.rolePrompt,
            JSON.stringify(full.modelConfig),
            JSON.stringify(full.modelRouting),
            JSON.stringify(full.toolConfig),
            JSON.stringify(full.memoryConfig),
            full.maxSteps,
            full.openingStatement,
            JSON.stringify(full.openingQuestions),
            JSON.stringify(full.quickCommands),
            JSON.stringify(full.autoQuestions),
            JSON.stringify(full.formFields),
            full.mcpServerIds,
            JSON.stringify(full.publishConfig),
            full.createBy,
        ],
    );
    return { id: inserted[0].id, accessToken, created: true };
}

async function main() {
    const db = createDb();

    try {
        const [mcpId, modelId, ownerId] = await Promise.all([
            resolveErpMcpId(db),
            resolveLlmModelId(db),
            resolveOwnerId(db),
        ]);

        const { id, accessToken, created } = await upsertAgent(db, { mcpId, modelId, ownerId });

        console.log(`${created ? "Created" : "Updated"} "${ERPNEXT_ASSISTANT_AGENT_NAME}" (${id})`);
        console.log(`Model: ${modelId}`);
        console.log(`MCP (ERP only): ${mcpId}`);
        console.log(`Embed path: /agents/${id}/${accessToken}`);
    } finally {
        await db.end();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
