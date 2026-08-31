import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Built-in tools use stable names such as builtin:sandbox-read, not UUIDs. */
export class FixToolGatewayBuiltinIds1788420000000 implements MigrationInterface {
    name = "FixToolGatewayBuiltinIds1788420000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["tool_gateway_approvals", "tool_gateway_executions"]) {
            if (!(await queryRunner.hasTable(table))) continue;
            await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "tool_id" TYPE varchar(120) USING "tool_id"::text`);
        }
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        // UUID conversion is not safe for built-in records; retain varchar on rollback.
        void queryRunner;
    }
}
