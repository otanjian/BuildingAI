import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Adds explicit environment, budget and rate bindings used by discovery/execution policy. */
export class AddToolPolicyLimits1788430000000 implements MigrationInterface {
    name = "AddToolPolicyLimits1788430000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("tool_gateway_definitions"))) return;
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" ADD COLUMN IF NOT EXISTS "environment" varchar(32)`);
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" ADD COLUMN IF NOT EXISTS "budget_limit" integer NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" ADD COLUMN IF NOT EXISTS "rate_limit_per_minute" integer NOT NULL DEFAULT 0`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("tool_gateway_definitions"))) return;
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" DROP COLUMN IF EXISTS "rate_limit_per_minute"`);
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" DROP COLUMN IF EXISTS "budget_limit"`);
        await queryRunner.query(`ALTER TABLE "tool_gateway_definitions" DROP COLUMN IF EXISTS "environment"`);
    }
}
