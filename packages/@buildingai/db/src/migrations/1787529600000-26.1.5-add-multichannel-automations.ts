import type { MigrationInterface, QueryRunner } from "typeorm";

/** Durable storage for channel-neutral scheduled agent automations. */
export class Migration1787529600000 implements MigrationInterface {
    name = "Migration1787529600000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "channel_account" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "provider" VARCHAR(64) NOT NULL,
                "account_key" VARCHAR(255) NOT NULL,
                "tenant_ref" VARCHAR(255),
                "secret_ref" VARCHAR(255),
                "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "enabled" BOOLEAN NOT NULL DEFAULT true,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "pk_channel_account" PRIMARY KEY ("id"),
                CONSTRAINT "uq_channel_account_provider_key" UNIQUE ("provider", "account_key"),
                CONSTRAINT "ck_channel_account_provider" CHECK (LENGTH(TRIM("provider")) BETWEEN 1 AND 64),
                CONSTRAINT "ck_channel_account_key" CHECK (LENGTH(TRIM("account_key")) BETWEEN 1 AND 255)
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "automation_job" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "name" VARCHAR(200) NOT NULL,
                "agent_id" VARCHAR(255) NOT NULL,
                "prompt" TEXT NOT NULL,
                "schedule_kind" VARCHAR(16) NOT NULL,
                "schedule" JSONB NOT NULL,
                "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
                "channel" VARCHAR(64) NOT NULL,
                "channel_account_id" UUID NOT NULL,
                "creator_id" VARCHAR(255) NOT NULL,
                "tenant_id" VARCHAR(255),
                "conversation_id" VARCHAR(255) NOT NULL,
                "delivery_target" JSONB NOT NULL,
                "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                "next_run_at" TIMESTAMPTZ NOT NULL,
                "last_run_at" TIMESTAMPTZ,
                "missed_run_policy" VARCHAR(16) NOT NULL DEFAULT 'fire_once',
                "overlap_policy" VARCHAR(16) NOT NULL DEFAULT 'skip',
                "timeout_seconds" INTEGER NOT NULL DEFAULT 900,
                "retry_policy" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "tool_policy" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "delivery_policy" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "delete_after_run" BOOLEAN NOT NULL DEFAULT false,
                "create_idempotency_key" VARCHAR(128),
                "retention_until" TIMESTAMPTZ,
                "deleted_at" TIMESTAMPTZ,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "pk_automation_job" PRIMARY KEY ("id"),
                CONSTRAINT "fk_automation_job_channel_account" FOREIGN KEY ("channel_account_id") REFERENCES "channel_account"("id") ON DELETE RESTRICT,
                CONSTRAINT "ck_automation_job_prompt" CHECK (LENGTH(TRIM("prompt")) BETWEEN 1 AND 12000),
                CONSTRAINT "ck_automation_job_status" CHECK ("status" IN ('active', 'paused', 'cancelled', 'completed', 'failed')),
                CONSTRAINT "ck_automation_job_schedule_kind" CHECK ("schedule_kind" IN ('at', 'every', 'cron')),
                CONSTRAINT "ck_automation_job_timeout" CHECK ("timeout_seconds" BETWEEN 1 AND 86400)
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "automation_run" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "job_id" UUID NOT NULL,
                "occurrence_key" VARCHAR(255) NOT NULL,
                "trigger" VARCHAR(64) NOT NULL DEFAULT 'scheduled',
                "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
                "scheduled_at" TIMESTAMPTZ NOT NULL,
                "started_at" TIMESTAMPTZ,
                "finished_at" TIMESTAMPTZ,
                "attempt" INTEGER NOT NULL DEFAULT 0,
                "conversation_id" VARCHAR(255),
                "result_preview" TEXT,
                "error_preview" TEXT,
                "delivery_status" VARCHAR(32) NOT NULL DEFAULT 'pending',
                "provider_message_id" VARCHAR(255),
                "retention_until" TIMESTAMPTZ,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "pk_automation_run" PRIMARY KEY ("id"),
                CONSTRAINT "fk_automation_run_job" FOREIGN KEY ("job_id") REFERENCES "automation_job"("id") ON DELETE CASCADE,
                CONSTRAINT "uq_automation_run_occurrence" UNIQUE ("job_id", "occurrence_key"),
                CONSTRAINT "ck_automation_run_status" CHECK ("status" IN ('pending', 'queued', 'running', 'succeeded', 'failed', 'timed_out', 'cancelled', 'unknown', 'skipped'))
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "automation_dispatch" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "job_id" UUID NOT NULL,
                "run_id" UUID NOT NULL,
                "dispatch_key" VARCHAR(255) NOT NULL,
                "kind" VARCHAR(64) NOT NULL,
                "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
                "attempts" INTEGER NOT NULL DEFAULT 0,
                "lease_until" TIMESTAMPTZ,
                "next_attempt_at" TIMESTAMPTZ,
                "sent_at" TIMESTAMPTZ,
                "last_error" TEXT,
                "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "pk_automation_dispatch" PRIMARY KEY ("id"),
                CONSTRAINT "fk_automation_dispatch_job" FOREIGN KEY ("job_id") REFERENCES "automation_job"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_automation_dispatch_run" FOREIGN KEY ("run_id") REFERENCES "automation_run"("id") ON DELETE CASCADE,
                CONSTRAINT "uq_automation_dispatch_key" UNIQUE ("dispatch_key"),
                CONSTRAINT "ck_automation_dispatch_status" CHECK ("status" IN ('pending', 'leased', 'sent', 'failed', 'unknown', 'dismissed'))
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_job_due" ON "automation_job" ("status", "next_run_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_job_scope" ON "automation_job" ("creator_id", "channel", "conversation_id", "status")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_job_account" ON "automation_job" ("channel_account_id", "status")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_automation_job_create_idempotency" ON "automation_job" ("creator_id", "create_idempotency_key") WHERE "create_idempotency_key" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_run_job_created" ON "automation_run" ("job_id", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_run_status" ON "automation_run" ("status", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_automation_dispatch_recovery" ON "automation_dispatch" ("status", "lease_until", "next_attempt_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_dispatch"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_run"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "automation_job"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "channel_account"`);
    }
}
