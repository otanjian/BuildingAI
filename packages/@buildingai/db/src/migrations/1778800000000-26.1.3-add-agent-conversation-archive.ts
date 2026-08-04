/**
 * Migration: add archived_at to ai_agent_chat_record
 * Adds soft archive marker column for agent conversation archive feature.
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1778800000000 implements MigrationInterface {
    name = "Migration1778800000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP WITH TIME ZONE`,
        );
        await queryRunner.query(
            `COMMENT ON COLUMN "ai_agent_chat_record"."archived_at" IS '归档时间，非空表示已归档'`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_ai_agent_chat_record_archived_at" ON "ai_agent_chat_record" ("archived_at")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DROP INDEX IF EXISTS "IDX_ai_agent_chat_record_archived_at"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_chat_record" DROP COLUMN IF EXISTS "archived_at"`,
        );
    }
}
