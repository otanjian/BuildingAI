/**
 * Migration: add sensitive_word_config to ai_agent
 * Adds per-agent sensitive word replacement config column.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1778900000000 implements MigrationInterface {
    name = "Migration1778900000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "sensitive_word_config" json`,
        );
        await queryRunner.query(
            `COMMENT ON COLUMN "ai_agent"."sensitive_word_config" IS '敏感词过滤配置'`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ai_agent" DROP COLUMN IF EXISTS "sensitive_word_config"`,
        );
    }
}
