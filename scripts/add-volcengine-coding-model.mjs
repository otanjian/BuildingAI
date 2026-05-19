/**
 * Insert volcengine-coding provider and ark-code-latest model via psql.
 *
 * Usage (from project root):
 *   node scripts/add-volcengine-coding-model.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";

function loadEnv() {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = value;
    }
}

function psql(sql) {
    const user = process.env.DB_USERNAME || "postgres";
    const db = process.env.DB_DATABASE || "buildingai";
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const bin = process.env.PSQL_BIN || "/opt/homebrew/opt/postgresql@17/bin/psql";
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || "" };
    const file = join(tmpdir(), `add-volcengine-coding-${Date.now()}.sql`);
    writeFileSync(file, sql, "utf-8");
    try {
        execSync(`${bin} -h ${host} -p ${port} -U ${user} -d ${db} -v ON_ERROR_STOP=1 -f ${file}`, {
            stdio: "inherit",
            env,
        });
    } finally {
        unlinkSync(file);
    }
}

loadEnv();

const sql = `
DO $$
DECLARE
    pid uuid;
BEGIN
    SELECT id INTO pid FROM ai_providers WHERE provider = 'volcengine-coding';
    IF pid IS NULL THEN
        pid := gen_random_uuid();
        INSERT INTO ai_providers (
            id, created_at, updated_at, provider, name, supported_model_types,
            is_active, is_built_in, sort_order
        ) VALUES (
            pid, NOW(), NOW(), 'volcengine-coding', '火山引擎 Coding', ARRAY['llm']::text[],
            false, true, 0
        );
        RAISE NOTICE 'Created provider volcengine-coding %', pid;
    ELSE
        RAISE NOTICE 'Provider volcengine-coding already exists %', pid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM ai_models WHERE provider_id = pid AND model = 'ark-code-latest') THEN
        INSERT INTO ai_models (
            id, created_at, updated_at, name, model, model_type, provider_id,
            features, max_context, model_config, is_active, thinking,
            enable_thinking_param, sort_order, billing_rule, membership_level, is_built_in
        ) VALUES (
            gen_random_uuid(), NOW(), NOW(), 'ark-code-latest', 'ark-code-latest', 'llm', pid,
            '["agent-thought","tool-call","multi-tool-call","stream-tool-call"]'::jsonb,
            5,
            '[{"field":"context_size","title":"context_size","description":"context_size","value":256000,"enable":true},{"field":"max_tokens","title":"max_tokens","description":"max_tokens","value":32000,"enable":true},{"field":"max_completion_tokens","title":"max_completion_tokens","description":"max_completion_tokens","value":32000,"enable":true},{"field":"mode","title":"mode","description":"mode","value":"chat","enable":true}]'::jsonb,
            false, false, false, 0, '{"power":0,"tokens":1000}'::jsonb, '[]'::jsonb, true
        );
        RAISE NOTICE 'Created model ark-code-latest';
    ELSE
        RAISE NOTICE 'Model ark-code-latest already exists';
    END IF;
END $$;
`;

psql(sql);

console.log("\n完成。请在后台：");
console.log("  1. 工作空间 → 模型厂商 → 启用「火山引擎 Coding」");
console.log("  2. 密钥管理 → 绑定火山方舟 API Key");
console.log("  3. baseUrl 可留空（默认 https://ark.cn-beijing.volces.com/api/coding/v3）");
