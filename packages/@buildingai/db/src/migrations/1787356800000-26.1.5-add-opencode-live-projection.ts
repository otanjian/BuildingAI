import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1787356800000 implements MigrationInterface {
    name = "Migration1787356800000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" ADD COLUMN IF NOT EXISTS "live_projection" JSONB`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" ADD COLUMN IF NOT EXISTS "projection_version" BIGINT NOT NULL DEFAULT 0`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" ADD COLUMN IF NOT EXISTS "projection_updated_at" TIMESTAMP WITH TIME ZONE`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_oc_turn_projection_version",
            `CHECK ("projection_version" >= 0)`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_oc_turn_terminal_projection",
            `CHECK (
                "status" IN ('accepted', 'running', 'committing')
                OR ("live_projection" IS NULL AND "projection_updated_at" IS NULL)
            )`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" DROP CONSTRAINT IF EXISTS "ck_oc_turn_terminal_projection"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" DROP CONSTRAINT IF EXISTS "ck_oc_turn_projection_version"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" DROP COLUMN IF EXISTS "projection_updated_at"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" DROP COLUMN IF EXISTS "projection_version"`,
        );
        await queryRunner.query(
            `ALTER TABLE "ai_agent_opencode_turn" DROP COLUMN IF EXISTS "live_projection"`,
        );
    }

    private async addConstraintIfMissing(
        queryRunner: QueryRunner,
        constraint: string,
        definition: string,
    ): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = '${constraint}'
                      AND conrelid = '"ai_agent_opencode_turn"'::regclass
                ) THEN
                    ALTER TABLE "ai_agent_opencode_turn"
                    ADD CONSTRAINT "${constraint}" ${definition};
                END IF;
            END
            $$
        `);
    }
}
