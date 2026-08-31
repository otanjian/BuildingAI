import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Allow channel rows to rely exclusively on tenant credential references. */
export class AllowCredentialOnlyChannels1788320000000 implements MigrationInterface {
    name = "AllowCredentialOnlyChannels1788320000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("wecom_aibot_connection"))) return;
        await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "bot_secret_encrypted" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "agent_access_token_encrypted" DROP NOT NULL`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("wecom_aibot_connection"))) return;
        await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "bot_secret_encrypted" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "agent_access_token_encrypted" SET NOT NULL`);
    }
}
