import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Follow-up migration for installations that already applied credential-security v1. */
export class AddCredentialReferences1788310000000 implements MigrationInterface {
    name = "AddCredentialReferences1788310000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["ai_agent", "ai_mcp_servers", "feishu_channel_connection", "wecom_aibot_connection"]) {
            if (await queryRunner.hasTable(table)) {
                await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "credential_ref" uuid`);
            }
        }
        if (await queryRunner.hasTable("wecom_aibot_connection")) {
            await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "bot_secret_encrypted" DROP NOT NULL`);
            await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "agent_access_token_encrypted" DROP NOT NULL`);
        }
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["ai_agent", "ai_mcp_servers", "feishu_channel_connection", "wecom_aibot_connection"]) {
            if (await queryRunner.hasTable(table)) {
                await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "credential_ref"`);
            }
        }
        if (await queryRunner.hasTable("wecom_aibot_connection")) {
            await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "bot_secret_encrypted" SET NOT NULL`);
            await queryRunner.query(`ALTER TABLE "wecom_aibot_connection" ALTER COLUMN "agent_access_token_encrypted" SET NOT NULL`);
        }
    }
}
