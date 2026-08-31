import type { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1788800000000 implements MigrationInterface {
    name = "Migration1788800000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "enterprise_identity_providers" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL, "type" VARCHAR(16) NOT NULL, "issuer" VARCHAR(500) NOT NULL, "audience" VARCHAR(255) NOT NULL,
                "metadata_url" VARCHAR(500), "certificate_fingerprint" TEXT, "settings" JSONB NOT NULL DEFAULT '{}'::jsonb, "enabled" BOOLEAN NOT NULL DEFAULT false, "config_version" INTEGER NOT NULL DEFAULT 1,
                CONSTRAINT "pk_enterprise_identity_providers" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_idp_tenant_name" UNIQUE ("tenant_id", "name"),
                CONSTRAINT "ck_enterprise_idp_type" CHECK ("type" IN ('oidc','saml'))
            );
            CREATE TABLE IF NOT EXISTS "enterprise_identity_domains" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "provider_id" UUID NOT NULL, "domain" VARCHAR(255) NOT NULL, "verified" BOOLEAN NOT NULL DEFAULT false,
                CONSTRAINT "pk_enterprise_identity_domains" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_identity_domain" UNIQUE ("domain")
            );
            CREATE TABLE IF NOT EXISTS "enterprise_directory_mappings" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "mapping_type" VARCHAR(24) NOT NULL, "external_id" VARCHAR(255) NOT NULL, "external_name" VARCHAR(120) NOT NULL, "role_code" VARCHAR(80), "project_id" UUID, "enabled" BOOLEAN NOT NULL DEFAULT true,
                CONSTRAINT "pk_enterprise_directory_mappings" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_directory_mapping" UNIQUE ("tenant_id", "external_id", "mapping_type")
            );
            CREATE TABLE IF NOT EXISTS "enterprise_scim_cursors" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "provider_id" UUID NOT NULL, "cursor_value" VARCHAR(255), "last_synced_at" TIMESTAMPTZ, "status" VARCHAR(24) NOT NULL DEFAULT 'idle',
                CONSTRAINT "pk_enterprise_scim_cursors" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_scim_cursor" UNIQUE ("tenant_id", "provider_id")
            );
            CREATE TABLE IF NOT EXISTS "enterprise_sync_events" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL, "provider_id" UUID NOT NULL, "external_event_id" VARCHAR(255) NOT NULL, "resource_type" VARCHAR(32) NOT NULL, "action" VARCHAR(32) NOT NULL, "status" VARCHAR(24) NOT NULL DEFAULT 'pending', "payload" JSONB NOT NULL DEFAULT '{}'::jsonb, "error" TEXT,
                CONSTRAINT "pk_enterprise_sync_events" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_sync_event" UNIQUE ("tenant_id", "provider_id", "external_event_id")
            );
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "enterprise_mfa_policies" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL UNIQUE, "required" BOOLEAN NOT NULL DEFAULT false, "step_up_minutes" INTEGER NOT NULL DEFAULT 15, "sensitive_actions" JSONB NOT NULL DEFAULT '[]'::jsonb, CONSTRAINT "pk_enterprise_mfa_policies" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_step_up_proofs" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL, "user_id" UUID NOT NULL, "action" VARCHAR(80) NOT NULL, "proof_hash" VARCHAR(128) NOT NULL, "expires_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "pk_enterprise_step_up_proofs" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_data_policies" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL UNIQUE, "default_classification" VARCHAR(24) NOT NULL DEFAULT 'internal', "allowed_regions" JSONB NOT NULL DEFAULT '[]'::jsonb, "allow_cross_region" BOOLEAN NOT NULL DEFAULT false, "allow_vendor_training" BOOLEAN NOT NULL DEFAULT false, "provider_rules" JSONB NOT NULL DEFAULT '{}'::jsonb, "masking_rules" JSONB NOT NULL DEFAULT '{}'::jsonb, CONSTRAINT "pk_enterprise_data_policies" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_retention_policies" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL, "classification" VARCHAR(24) NOT NULL, "retention_days" INTEGER NOT NULL, "delete_on_expiry" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "pk_enterprise_retention_policies" PRIMARY KEY ("id"), CONSTRAINT "uq_enterprise_retention_policy_scope" UNIQUE ("tenant_id", "classification"));
            CREATE TABLE IF NOT EXISTS "enterprise_legal_holds" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL, "name" VARCHAR(120) NOT NULL, "status" VARCHAR(24) NOT NULL DEFAULT 'active', "scope" JSONB NOT NULL DEFAULT '{}'::jsonb, "created_by" UUID, "released_at" TIMESTAMPTZ, CONSTRAINT "pk_enterprise_legal_holds" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_data_subject_requests" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL, "subject_user_id" UUID, "type" VARCHAR(24) NOT NULL, "status" VARCHAR(24) NOT NULL DEFAULT 'pending', "scope" JSONB NOT NULL DEFAULT '{}'::jsonb, "reason" TEXT, CONSTRAINT "pk_enterprise_data_subject_requests" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_governance_jobs" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "tenant_id" UUID NOT NULL, "request_id" UUID, "type" VARCHAR(24) NOT NULL, "status" VARCHAR(24) NOT NULL DEFAULT 'queued', "progress" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0, "scope" JSONB NOT NULL DEFAULT '{}'::jsonb, "summary" JSONB NOT NULL DEFAULT '{}'::jsonb, "last_error" TEXT, CONSTRAINT "pk_enterprise_governance_jobs" PRIMARY KEY ("id"));
            CREATE TABLE IF NOT EXISTS "enterprise_completion_manifests" ("id" UUID NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "job_id" UUID NOT NULL UNIQUE, "tenant_id" UUID NOT NULL, "manifest_hash" VARCHAR(128) NOT NULL, "record_count" INTEGER NOT NULL, "evidence" JSONB NOT NULL DEFAULT '[]'::jsonb, "completed_at" TIMESTAMPTZ NOT NULL, CONSTRAINT "pk_enterprise_completion_manifests" PRIMARY KEY ("id"));
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["enterprise_completion_manifests", "enterprise_governance_jobs", "enterprise_data_subject_requests", "enterprise_legal_holds", "enterprise_retention_policies", "enterprise_data_policies", "enterprise_step_up_proofs", "enterprise_mfa_policies", "enterprise_sync_events", "enterprise_scim_cursors", "enterprise_directory_mappings", "enterprise_identity_domains", "enterprise_identity_providers"]) {
            await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
        }
    }
}
