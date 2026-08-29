import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1779000000000 implements MigrationInterface {
    name = "Migration1779000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "feishu_channel_connection" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "name" character varying(200),
                "normalized_name" character varying(200),
                "agent_id" uuid,
                "app_id" character varying(255),
                "normalized_app_id" character varying(255),
                "app_secret_encrypted" text,
                "agent_access_token_encrypted" text,
                "enabled" boolean NOT NULL DEFAULT false,
                "only_mentioned" boolean NOT NULL DEFAULT true,
                "migration_status" character varying(16) NOT NULL DEFAULT 'active',
                "legacy_source_key" character varying(255),
                CONSTRAINT "PK_feishu_channel_connection" PRIMARY KEY ("id"),
                CONSTRAINT "FK_feishu_connection_agent" FOREIGN KEY ("agent_id") REFERENCES "ai_agent"("id") ON DELETE RESTRICT,
                CONSTRAINT "CK_feishu_connection_migration_status" CHECK ("migration_status" IN ('active', 'legacy', 'conflict', 'orphaned', 'deleting'))
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_feishu_connection_app_id" ON "feishu_channel_connection" ("normalized_app_id") WHERE "normalized_app_id" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_feishu_connection_agent_name" ON "feishu_channel_connection" ("agent_id", "normalized_name") WHERE "agent_id" IS NOT NULL AND "normalized_name" IS NOT NULL`);
        await queryRunner.query(`ALTER TABLE "feishu_channel_connection" ADD COLUMN IF NOT EXISTS "migration_error" text`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_feishu_connection_agent_enabled" ON "feishu_channel_connection" ("agent_id", "enabled")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_feishu_connection_status" ON "feishu_channel_connection" ("migration_status", "enabled")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "feishu_channel_connection"`);
    }
}
