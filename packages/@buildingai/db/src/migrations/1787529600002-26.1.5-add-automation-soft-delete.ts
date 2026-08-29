import type { MigrationInterface, QueryRunner } from "typeorm";

/** Adds the soft-delete marker used when a one-shot automation opts into delete-after-run. */
export class Migration1787529600002 implements MigrationInterface {
    name = "Migration1787529600002";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "automation_job" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "automation_job" DROP COLUMN IF EXISTS "deleted_at"`,
        );
    }
}
