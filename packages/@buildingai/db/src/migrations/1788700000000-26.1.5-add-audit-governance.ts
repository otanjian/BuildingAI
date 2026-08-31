import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Audit, usage, cost and budget governance primitives. */
export class AddAuditGovernance1788700000000 implements MigrationInterface {
    name = "AddAuditGovernance1788700000000";
    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "audit_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL, "project_id" uuid, "actor_id" uuid, "agent_id" uuid, "agent_version_id" varchar(120),
                "action" varchar(80) NOT NULL, "outcome" varchar(24) NOT NULL, "resource_type" varchar(80), "resource_id" varchar(160),
                "request_id" varchar(120) NOT NULL, "correlation_id" varchar(120) NOT NULL, "trace_id" varchar(120), "policy_version" varchar(64), "latency_ms" integer,
                "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb, "payload_digest" varchar(64) NOT NULL, CONSTRAINT "pk_audit_events" PRIMARY KEY ("id")
            )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_events_scope_created" ON "audit_events" ("tenant_id", "project_id", "created_at")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_events_correlation" ON "audit_events" ("tenant_id", "correlation_id", "created_at")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "usage_events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL, "department_id" uuid, "project_id" uuid, "agent_id" uuid, "actor_id" uuid, "kind" varchar(64) NOT NULL,
                "provider" varchar(120), "model" varchar(120), "input_tokens" bigint NOT NULL DEFAULT 0, "output_tokens" bigint NOT NULL DEFAULT 0, "duration_ms" bigint NOT NULL DEFAULT 0,
                "quantity" numeric(20,8) NOT NULL DEFAULT 0, "amount" numeric(20,8) NOT NULL DEFAULT 0, "price_version" varchar(64), "request_id" varchar(120) NOT NULL,
                "correlation_id" varchar(120) NOT NULL, "idempotency_key" varchar(160) NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_usage_events" PRIMARY KEY ("id"), CONSTRAINT "uq_usage_events_idempotency" UNIQUE ("tenant_id", "idempotency_key")
            )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_usage_events_scope_created" ON "usage_events" ("tenant_id", "project_id", "created_at")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "cost_ledger" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL, "department_id" uuid, "project_id" uuid, "agent_id" uuid, "actor_id" uuid, "state" varchar(24) NOT NULL DEFAULT 'reserved',
                "reserved_amount" numeric(20,8) NOT NULL DEFAULT 0, "settled_amount" numeric(20,8) NOT NULL DEFAULT 0, "price_version" varchar(64),
                "idempotency_key" varchar(160) NOT NULL, "request_id" varchar(120) NOT NULL, "correlation_id" varchar(120) NOT NULL, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_cost_ledger" PRIMARY KEY ("id"), CONSTRAINT "uq_cost_ledger_idempotency" UNIQUE ("tenant_id", "idempotency_key")
            )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_cost_ledger_scope_created" ON "cost_ledger" ("tenant_id", "project_id", "created_at")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "budget_policies" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL, "scope" varchar(24) NOT NULL, "scope_id" varchar(160) NOT NULL, "period_start" timestamptz NOT NULL, "period_end" timestamptz NOT NULL,
                "soft_limit" numeric(20,8) NOT NULL DEFAULT 0, "hard_limit" numeric(20,8) NOT NULL DEFAULT 0, "rate_per_minute" integer, "concurrency_limit" integer,
                "model_allowlist" jsonb NOT NULL DEFAULT '[]'::jsonb, "tool_allowlist" jsonb NOT NULL DEFAULT '[]'::jsonb, "alert_threshold" numeric(5,2) NOT NULL DEFAULT 0.8, "enabled" boolean NOT NULL DEFAULT true,
                CONSTRAINT "pk_budget_policies" PRIMARY KEY ("id")
            )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_budget_policy_scope" ON "budget_policies" ("tenant_id", "scope", "scope_id", "enabled")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "price_versions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "provider" varchar(120) NOT NULL, "model" varchar(120) NOT NULL, "version" varchar(64) NOT NULL, "input_unit_price" numeric(20,12) NOT NULL DEFAULT 0,
                "output_unit_price" numeric(20,12) NOT NULL DEFAULT 0, "tool_unit_price" numeric(20,12) NOT NULL DEFAULT 0, "effective_from" timestamptz NOT NULL, "effective_to" timestamptz, "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_price_versions" PRIMARY KEY ("id"), CONSTRAINT "uq_price_version_provider_model" UNIQUE ("provider", "model", "version")
            )`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "audit_outbox" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL, "topic" varchar(48) NOT NULL, "request_id" varchar(120) NOT NULL, "correlation_id" varchar(120) NOT NULL, "idempotency_key" varchar(160) NOT NULL,
                "payload" jsonb NOT NULL, "status" varchar(24) NOT NULL DEFAULT 'pending', "attempts_made" integer NOT NULL DEFAULT 0, "next_attempt_at" timestamptz, "last_error" text, "payload_digest" varchar(64) NOT NULL,
                CONSTRAINT "pk_audit_outbox" PRIMARY KEY ("id"), CONSTRAINT "uq_audit_outbox_idempotency" UNIQUE ("tenant_id", "idempotency_key")
            )`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_outbox_delivery" ON "audit_outbox" ("status", "next_attempt_at")`);
    }
    async down(queryRunner: QueryRunner): Promise<void> {
        for (const table of ["audit_outbox", "price_versions", "budget_policies", "cost_ledger", "usage_events", "audit_events"]) await queryRunner.query(`DROP TABLE IF EXISTS "${table}"`);
    }
}
