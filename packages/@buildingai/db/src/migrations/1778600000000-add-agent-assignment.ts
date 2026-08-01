/**
 * Migration: add agent assignment and square visibility
 * Adds ai_agent_assignments table and squareVisibility column to ai_agent
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1778600000000 implements MigrationInterface {
    name = "Migration1778600000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add squareVisibility column to ai_agent
        await queryRunner.query(
            `ALTER TABLE "ai_agent" ADD COLUMN IF NOT EXISTS "square_visibility" character varying(20) NOT NULL DEFAULT 'assigned'`,
        );
        await queryRunner.query(
            `COMMENT ON COLUMN "ai_agent"."square_visibility" IS '广场可见性：all-所有人可见，assigned-仅分配用户可见'`,
        );

        // Create ai_agent_assignments table
        await queryRunner.query(
            `CREATE TABLE IF NOT EXISTS "ai_agent_assignments" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "agent_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "assigned_by" uuid NOT NULL,
                CONSTRAINT "PK_agent_assignments" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_agent_assignments_agent_user" UNIQUE ("agent_id", "user_id")
            )`,
        );
        await queryRunner.query(`COMMENT ON TABLE "ai_agent_assignments" IS '智能体分配管理'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_agent_assignments"."agent_id" IS '智能体ID'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_agent_assignments"."user_id" IS '用户ID'`);
        await queryRunner.query(`COMMENT ON COLUMN "ai_agent_assignments"."assigned_by" IS '分配者ID'`);

        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_agent_assignments_agent_user" ON "ai_agent_assignments" ("agent_id", "user_id")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "IDX_agent_assignments_user" ON "ai_agent_assignments" ("user_id")`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_assignments_agent_user"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_assignments_user"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_assignments"`);
        await queryRunner.query(`ALTER TABLE "ai_agent" DROP COLUMN IF EXISTS "square_visibility"`);
    }
}
