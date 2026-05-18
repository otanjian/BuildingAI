/**
 * Migration: ai-model-seed-sync
 * Version: 26.1.1
 *
 * - Inserts DeepSeek `deepseek-v4-flash` and `deepseek-v4-pro` when missing for the built-in `deepseek` provider.
 * - Renames mistaken `glm-glm-asr-2512` to `glm-asr-2512` for `zhipuai` when the correct slug is not already present.
 *
 * Down is intentionally empty: row-level provenance is not tracked for safe rollback.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

/** Feature list aligned with `model-config.json` for DeepSeek v4 models. */
const DEEPSEEK_V4_FEATURES = [
    "agent-thought",
    "tool-call",
    "multi-tool-call",
    "stream-tool-call",
] as const;

/**
 * Builds `model_config` JSONB payload matching {@link AiModelSeeder} transformation from `model_properties`.
 *
 * @param contextSize - Context window size from seed config.
 * @returns Serializable array for `ai_models.model_config`.
 */
function buildDeepSeekV4ModelConfig(contextSize: number): Array<{
    field: string;
    title: string;
    description: string;
    value: unknown;
    enable: boolean;
}> {
    return [
        {
            field: "context_size",
            title: "context_size",
            description: "context_size",
            value: contextSize,
            enable: true,
        },
        {
            field: "mode",
            title: "mode",
            description: "mode",
            value: "chat",
            enable: true,
        },
    ];
}

export class Migration1778524800000 implements MigrationInterface {
    name = "Migration1778524800000";

    /**
     * Inserts a built-in DeepSeek LLM row when no row exists for the same `provider_id` + `model` slug.
     *
     * @param queryRunner - TypeORM query runner.
     * @param modelSlug - API model identifier (e.g. `deepseek-v4-flash`).
     * @param displayName - Human-readable name (seed uses label === slug for these entries).
     * @param contextSize - `context_size` from seed `model_properties`.
     */
    private async insertDeepSeekModelIfMissing(
        queryRunner: QueryRunner,
        modelSlug: string,
        displayName: string,
        contextSize: number,
    ): Promise<void> {
        const featuresJson = JSON.stringify([...DEEPSEEK_V4_FEATURES]);
        const modelConfigJson = JSON.stringify(buildDeepSeekV4ModelConfig(contextSize));

        // Explicit varchar casts: same `$n` in SELECT and in `NOT EXISTS` otherwise Postgres infers
        // `text` vs `character varying` and fails with "inconsistent types deduced for parameter".
        await queryRunner.query(
            `
            INSERT INTO ai_models (
                id,
                created_at,
                updated_at,
                name,
                model,
                model_type,
                provider_id,
                features,
                model_config,
                thinking,
                enable_thinking_param,
                is_active,
                is_built_in,
                sort_order,
                billing_rule,
                membership_level,
                max_context
            )
            SELECT
                uuid_generate_v4(),
                NOW(),
                NOW(),
                $1::character varying(100),
                $2::character varying(100),
                'llm',
                p.id,
                $3::jsonb,
                $4::jsonb,
                false,
                false,
                true,
                true,
                0,
                '{"power":0,"tokens":1000}'::jsonb,
                '[]'::jsonb,
                5
            FROM ai_providers p
            WHERE p.provider = 'deepseek'
              AND NOT EXISTS (
                  SELECT 1
                  FROM ai_models m
                  WHERE m.provider_id = p.id
                    AND m.model = $2::character varying(100)
              )
            `,
            [displayName, modelSlug, featuresJson, modelConfigJson],
        );
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.insertDeepSeekModelIfMissing(
            queryRunner,
            "deepseek-v4-flash",
            "deepseek-v4-flash",
            1_000_000,
        );
        await this.insertDeepSeekModelIfMissing(
            queryRunner,
            "deepseek-v4-pro",
            "deepseek-v4-pro",
            1_000_000,
        );

        /**
         * Fix legacy typo `glm-glm-asr-2512` → `glm-asr-2512` for Zhipu (智谱) provider only.
         * Skip when a row with `glm-asr-2512` already exists to avoid unique (`provider_id`,`model`) violations.
         */
        await queryRunner.query(`
            UPDATE ai_models AS m
            SET
                model = 'glm-asr-2512',
                name = 'glm-asr-2512',
                updated_at = NOW()
            FROM ai_providers AS p
            WHERE m.provider_id = p.id
              AND p.provider = 'zhipuai'
              AND m.model = 'glm-glm-asr-2512'
              AND NOT EXISTS (
                  SELECT 1
                  FROM ai_models AS existing
                  WHERE existing.provider_id = m.provider_id
                    AND existing.model = 'glm-asr-2512'
              )
        `);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // Intentionally no-op: cannot distinguish migration-inserted rows from operator-created ones.
    }
}
