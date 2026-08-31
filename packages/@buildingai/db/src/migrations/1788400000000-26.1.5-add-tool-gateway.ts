import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Central registry, approval and redacted execution records for outbound tools. */
export class AddToolGateway1788400000000 implements MigrationInterface {
    name = "AddToolGateway1788400000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "permissions" ("id", "created_at", "updated_at", "code", "name", "description", "group", "group_name", "type", "is_deprecated")
            SELECT uuid_generate_v4(), now(), now(), 'tool-gateway:list', '查看工具注册', 'Tool Gateway', 'tool-gateway', '工具网关', 'system', false
            WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'tool-gateway:list')
        `).catch(() => undefined);
        await queryRunner.query(`
            INSERT INTO "menus" ("id", "name", "code", "path", "icon", "component", "permissionCode", "parentId", "sort", "isHidden", "type", "sourceType", "created_at", "updated_at")
            SELECT uuid_generate_v4(), '工具网关', 'ai-tool-gateway', 'tool-gateway', 'shield-check', '/console/ai/tool-gateway/list', 'tool-gateway:list', "id", 350, 0, 2, 1, now(), now()
            FROM "menus" workspace WHERE workspace."code" = 'workspace'
              AND NOT EXISTS (SELECT 1 FROM "menus" WHERE "code" = 'ai-tool-gateway')
        `).catch(() => undefined);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tool_gateway_definitions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid,
                "project_id" uuid,
                "agent_version_id" varchar(120),
                "name" varchar(120) NOT NULL,
                "version" varchar(40) NOT NULL DEFAULT '1.0.0',
                "description" text,
                "capabilities" jsonb NOT NULL DEFAULT '[]'::jsonb,
                "input_schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "output_schema" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "risk" varchar(20) NOT NULL DEFAULT 'READ',
                "credential_ref" uuid,
                "timeout_ms" integer NOT NULL DEFAULT 15000,
                "response_size_limit" integer NOT NULL DEFAULT 1048576,
                "network_policy" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "idempotency_required" boolean NOT NULL DEFAULT false,
                "approval_mode" varchar(24) NOT NULL DEFAULT 'none',
                "max_concurrency" integer NOT NULL DEFAULT 4,
                "max_retries" integer NOT NULL DEFAULT 0,
                "status" varchar(24) NOT NULL DEFAULT 'active',
                "policy_version" integer NOT NULL DEFAULT 1,
                "created_by" uuid,
                CONSTRAINT "pk_tool_gateway_definitions" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tool_gateway_definition_version" UNIQUE ("tenant_id", "name", "version")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_gateway_definition_scope" ON "tool_gateway_definitions" ("tenant_id", "project_id", "agent_version_id", "status")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tool_gateway_approvals" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL,
                "project_id" uuid,
                "tool_id" varchar(120) NOT NULL,
                "requested_by" uuid,
                "decided_by" uuid,
                "status" varchar(24) NOT NULL DEFAULT 'pending',
                "parameter_digest" text NOT NULL,
                "redacted_parameters" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "expires_at" timestamptz NOT NULL,
                "reason" text,
                CONSTRAINT "pk_tool_gateway_approvals" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_gateway_approval_scope" ON "tool_gateway_approvals" ("tenant_id", "status", "expires_at")`);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tool_gateway_executions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" timestamptz NOT NULL DEFAULT now(),
                "updated_at" timestamptz NOT NULL DEFAULT now(),
                "tenant_id" uuid NOT NULL,
                "project_id" uuid,
                "tool_id" varchar(120) NOT NULL,
                "tool_name" varchar(120) NOT NULL,
                "tool_version" varchar(40) NOT NULL,
                "actor_id" uuid,
                "risk" varchar(20) NOT NULL,
                "outcome" varchar(24) NOT NULL,
                "denial_reason" varchar(80),
                "parameter_digest" text NOT NULL,
                "redacted_input" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "redacted_output" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "attempts" integer NOT NULL DEFAULT 1,
                "latency_ms" integer NOT NULL DEFAULT 0,
                "idempotency_key" varchar(120),
                "policy_version" varchar(120) NOT NULL,
                CONSTRAINT "pk_tool_gateway_executions" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tool_gateway_execution_scope" ON "tool_gateway_executions" ("tenant_id", "created_at")`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "idx_tool_gateway_execution_idempotency" ON "tool_gateway_executions" ("tenant_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "tool_gateway_executions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tool_gateway_approvals"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tool_gateway_definitions"`);
    }
}
