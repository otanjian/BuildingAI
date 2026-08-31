import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Immutable Agent version/release foundation. All statements are idempotent for upgrade retries. */
export class AddAgentVersionRelease1788600000000 implements MigrationInterface {
    name = "AddAgentVersionRelease1788600000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "agent_id" uuid NOT NULL, "tenant_id" uuid, "project_id" uuid, "version_number" integer NOT NULL, "label" varchar(120),
                "status" varchar(24) NOT NULL DEFAULT 'draft', "snapshot" jsonb NOT NULL, "config_hash" varchar(64) NOT NULL,
                "dependency_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb, "created_by" uuid, "release_note" text, "base_version_id" uuid,
                "submitted_at" timestamptz, "approved_at" timestamptz, "published_at" timestamptz,
                CONSTRAINT "pk_ai_agent_versions" PRIMARY KEY ("id"),
                CONSTRAINT "ck_ai_agent_version_status" CHECK ("status" IN ('draft','submitted','approved','published','paused','archived'))
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_ai_agent_version_number" ON "ai_agent_versions" ("agent_id", "version_number")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_agent_version_scope" ON "ai_agent_versions" ("tenant_id", "project_id", "agent_id", "status")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_releases" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "agent_id" uuid NOT NULL, "version_id" uuid NOT NULL, "tenant_id" uuid, "project_id" uuid, "environment" varchar(24) NOT NULL,
                "status" varchar(24) NOT NULL DEFAULT 'pending', "revision" integer NOT NULL DEFAULT 0, "cohort_id" varchar(120), "traffic_percent" integer NOT NULL DEFAULT 100,
                "rollback_target_version_id" uuid, "published_by" uuid, "release_note" text, "evaluation_evidence" jsonb NOT NULL DEFAULT '{}'::jsonb, "idempotency_key" varchar(160),
                CONSTRAINT "pk_ai_agent_releases" PRIMARY KEY ("id"), CONSTRAINT "ck_ai_agent_release_environment" CHECK ("environment" IN ('development','test','staging','production')),
                CONSTRAINT "ck_ai_agent_release_status" CHECK ("status" IN ('pending','canary','active','paused','rolled_back','archived')), CONSTRAINT "ck_ai_agent_release_traffic" CHECK ("traffic_percent" BETWEEN 0 AND 100)
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_agent_release_scope" ON "ai_agent_releases" ("tenant_id", "project_id", "agent_id", "environment", "status")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_ai_agent_release_idempotency" ON "ai_agent_releases" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_release_approvals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "release_id" uuid NOT NULL, "version_id" uuid NOT NULL, "tenant_id" uuid, "gate_name" varchar(64) NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'pending',
                "decided_by" uuid, "decided_at" timestamptz, "evidence" jsonb NOT NULL DEFAULT '{}'::jsonb, "reason" text,
                CONSTRAINT "pk_ai_agent_release_approvals" PRIMARY KEY ("id"), CONSTRAINT "ck_ai_agent_release_approval_status" CHECK ("status" IN ('pending','approved','rejected','expired'))
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_ai_agent_release_approval_release" ON "ai_agent_release_approvals" ("release_id", "status")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_dependency_locks" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "version_id" uuid NOT NULL, "tenant_id" uuid, "dependency_type" varchar(48) NOT NULL, "dependency_id" varchar(160) NOT NULL,
                "dependency_version" varchar(120), "dependency_hash" varchar(64), "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_ai_agent_dependency_locks" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_ai_agent_dependency_lock" ON "ai_agent_dependency_locks" ("version_id", "dependency_type", "dependency_id")`);

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ai_agent_release_cohorts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "agent_id" uuid NOT NULL, "tenant_id" uuid, "project_id" uuid, "name" varchar(120) NOT NULL, "scope" varchar(24) NOT NULL DEFAULT 'tenant',
                "selector" jsonb NOT NULL DEFAULT '{}'::jsonb, "traffic_percent" integer NOT NULL DEFAULT 0, "enabled" boolean NOT NULL DEFAULT true,
                CONSTRAINT "pk_ai_agent_release_cohorts" PRIMARY KEY ("id"), CONSTRAINT "ck_ai_agent_release_cohort_scope" CHECK ("scope" IN ('tenant','project','channel','percentage')),
                CONSTRAINT "ck_ai_agent_release_cohort_traffic" CHECK ("traffic_percent" BETWEEN 0 AND 100)
            )
        `);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_ai_agent_release_cohort_name" ON "ai_agent_release_cohorts" ("tenant_id", "agent_id", "name")`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_release_cohorts"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_dependency_locks"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_release_approvals"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_releases"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "ai_agent_versions"`);
    }
}
