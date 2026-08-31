import type { MigrationInterface, QueryRunner } from "../typeorm";

export class AddEnterpriseCredentialSecurity1788300000000 implements MigrationInterface {
    name = "AddEnterpriseCredentialSecurity1788300000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["ai_agent", "ai_mcp_servers", "feishu_channel_connection", "wecom_aibot_connection"]) {
            if (await queryRunner.hasTable(table)) {
                await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "credential_ref" uuid`);
            }
        }
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_credentials" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL,
                "project_id" uuid,
                "name" character varying(120) NOT NULL,
                "provider" character varying(80) NOT NULL,
                "purpose" character varying(80) NOT NULL,
                "scopes" jsonb NOT NULL DEFAULT '[]',
                "environment" character varying(32) NOT NULL DEFAULT 'development',
                "status" character varying(24) NOT NULL DEFAULT 'active',
                "current_version_id" uuid,
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "last_used_at" TIMESTAMP WITH TIME ZONE,
                "created_by" uuid,
                "revoked_by" uuid,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "pk_tenant_credentials" PRIMARY KEY ("id"),
                CONSTRAINT "fk_tenant_credentials_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_tenant_credentials_project" FOREIGN KEY ("project_id") REFERENCES "tenant_projects"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_tenant_credentials_creator" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_tenant_credentials_revoker" FOREIGN KEY ("revoked_by") REFERENCES "user"("id") ON DELETE SET NULL
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_tenant_credentials_name" ON "tenant_credentials" ("tenant_id", "project_id", "name")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tenant_credentials_scope" ON "tenant_credentials" ("tenant_id", "project_id", "environment", "status")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_credential_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "credential_id" uuid NOT NULL,
                "version" integer NOT NULL,
                "algorithm" character varying(32) NOT NULL,
                "key_version" character varying(64) NOT NULL,
                "nonce" text NOT NULL,
                "auth_tag" text NOT NULL,
                "ciphertext" text NOT NULL,
                "fingerprint" character varying(64) NOT NULL,
                "expires_at" TIMESTAMP WITH TIME ZONE,
                "overlap_until" TIMESTAMP WITH TIME ZONE,
                "revoked_at" TIMESTAMP WITH TIME ZONE,
                "created_by" uuid,
                CONSTRAINT "pk_tenant_credential_versions" PRIMARY KEY ("id"),
                CONSTRAINT "fk_credential_versions_credential" FOREIGN KEY ("credential_id") REFERENCES "tenant_credentials"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_credential_versions_creator" FOREIGN KEY ("created_by") REFERENCES "user"("id") ON DELETE SET NULL,
                CONSTRAINT "uq_credential_version_number" UNIQUE ("credential_id", "version")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_credential_version_active" ON "tenant_credential_versions" ("credential_id", "revoked_at", "expires_at")`);
        // This migration may be replayed on installations where the table was
        // created by an earlier bootstrap or a partially completed run. Keep
        // the FK addition idempotent so the standard TypeORM runner can resume.
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conrelid = '"tenant_credentials"'::regclass
                      AND conname = 'fk_tenant_credentials_current_version'
                ) THEN
                    ALTER TABLE "tenant_credentials"
                        ADD CONSTRAINT "fk_tenant_credentials_current_version"
                        FOREIGN KEY ("current_version_id")
                        REFERENCES "tenant_credential_versions"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "tenant_credentials" DROP CONSTRAINT IF EXISTS "fk_tenant_credentials_current_version"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_credential_versions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_credentials"`);
        for (const table of ["ai_agent", "ai_mcp_servers", "feishu_channel_connection", "wecom_aibot_connection"]) {
            if (await queryRunner.hasTable(table)) {
                await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "credential_ref"`);
            }
        }
    }
}
