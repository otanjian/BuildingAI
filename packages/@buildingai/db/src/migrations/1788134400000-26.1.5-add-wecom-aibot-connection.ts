import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1788134400000 implements MigrationInterface {
    name = "Migration1788134400000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wecom_aibot_connection" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" text NOT NULL,
                "normalized_name" text NOT NULL,
                "agent_id" uuid NOT NULL,
                "bot_id" text NOT NULL,
                "normalized_bot_id" text NOT NULL,
                "bot_secret_encrypted" text NOT NULL,
                "agent_access_token_encrypted" text NOT NULL,
                "enabled" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_wecom_aibot_connection" PRIMARY KEY ("id"),
                CONSTRAINT "FK_wecom_aibot_connection_agent" FOREIGN KEY ("agent_id") REFERENCES "ai_agent"("id") ON DELETE RESTRICT
            )
        `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "uq_wecom_aibot_connection_bot_id" ON "wecom_aibot_connection" ("normalized_bot_id")`,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX IF NOT EXISTS "uq_wecom_aibot_connection_agent_name" ON "wecom_aibot_connection" ("agent_id", "normalized_name")`,
        );
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_wecom_aibot_connection_agent_enabled" ON "wecom_aibot_connection" ("agent_id", "enabled")`,
        );

        const permissions = [
            ["wecom-aibot-channel:list", "查看企业微信连接"],
            ["wecom-aibot-channel:create", "创建企业微信连接"],
            ["wecom-aibot-channel:update", "更新企业微信连接"],
            ["wecom-aibot-channel:test", "测试企业微信连接"],
            ["wecom-aibot-channel:toggle", "启停企业微信连接"],
            ["wecom-aibot-channel:delete", "删除企业微信连接"],
        ];
        for (const [code, name] of permissions) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
                 VALUES (uuid_generate_v4(), $1, $2, $2, 'wecom-aibot-channel', '企业微信智能机器人', 'system', false, now(), now())
                 ON CONFLICT ("code") DO NOTHING`,
                [code, name],
            );
        }
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r
            JOIN "permissions" p ON p."code" LIKE 'wecom-aibot-channel:%'
            ON CONFLICT DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "menus" (
                "id", "name", "code", "path", "icon", "component", "permissionCode",
                "parentId", "sort", "isHidden", "type", "sourceType", "created_at", "updated_at"
            )
            SELECT
                uuid_generate_v4(), '企业微信机器人', 'channel-wecom-aibot', 'wecom-aibot', '',
                '/console/channel/wecom-aibot/index', 'wecom-aibot-channel:list', parent."id",
                20, 0, 2, 1, now(), now()
            FROM "menus" parent
            WHERE parent."code" = 'channel-management'
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "menus" WHERE "code" = 'channel-wecom-aibot'`);
        await queryRunner.query(`
            DELETE FROM "role_permissions"
            WHERE "permission_id" IN (
                SELECT "id" FROM "permissions" WHERE "code" LIKE 'wecom-aibot-channel:%'
            )
        `);
        await queryRunner.query(
            `DELETE FROM "permissions" WHERE "code" LIKE 'wecom-aibot-channel:%'`,
        );
        await queryRunner.query(`DROP TABLE IF EXISTS "wecom_aibot_connection"`);
    }
}
