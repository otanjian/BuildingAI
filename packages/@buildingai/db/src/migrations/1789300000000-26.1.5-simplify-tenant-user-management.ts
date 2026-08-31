import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Establishes the simplified tenant/user boundary and reconciles legacy data.
 *
 * The migration deliberately does not manufacture a user. A default tenant can
 * only be created when an existing account can be selected as its administrator
 * (preferably the account named 谭建, then the oldest root account). This makes
 * the migration safe for empty/bootstrap databases while keeping it replayable.
 */
export class SimplifyTenantUserManagement1789300000000 implements MigrationInterface {
    name = "SimplifyTenantUserManagement1789300000000";

    /** Tables that represent tenant-owned data in the current application. */
    private readonly tenantOwnedTables = [
        "ai_agent",
        "ai_agent_versions",
        "ai_agent_releases",
        "ai_agent_release_approvals",
        "ai_agent_release_cohorts",
        "ai_agent_dependency_locks",
        "ai_agent_assignments",
        "ai_agent_chat_record",
        "ai_agent_chat_message",
        "ai_agent_chat_message_feedback",
        "ai_agent_opencode_turn",
        "ai_agent_memory",
        "ai_chat_record",
        "ai_chat_message",
        "ai_chat_tool_call",
        "ai_chat_feedback",
        "ai_mcp_servers",
        "ai_mcp_tool",
        "ai_user_mcp_server",
        "ai_user_memory",
        "datasets",
        "datasets_documents",
        "datasets_segments",
        "datasets_embeddings",
        "datasets_ingestion_jobs",
        "datasets_deletion_evidence",
        "datasets_chat_record",
        "datasets_chat_message",
        "dataset_members",
        "dataset_member_applications",
        "automation_job",
        "automation_run",
        "automation_dispatch",
        "tenant_credentials",
        "tenant_credential_versions",
        "secret_config",
        "account_log",
        "analyse",
        "channel_account",
        "feishu_channel_connection",
        "wecom_aibot_connection",
        "audit_events",
        "audit_outbox",
        "usage_events",
        "cost_ledger",
        "budget_policies",
        "tool_gateway_definitions",
        "tool_gateway_approvals",
        "tool_gateway_executions",
        "ai_evaluation_datasets",
        "ai_evaluation_dataset_versions",
        "ai_evaluation_cases",
        "ai_evaluation_runs",
        "ai_evaluation_results",
        "ai_evaluation_evaluators",
        "ai_evaluation_gate_evidence",
        "ai_evaluation_feedback",
        "enterprise_identity_providers",
        "enterprise_identity_domains",
        "enterprise_directory_mappings",
        "enterprise_scim_cursors",
        "enterprise_sync_events",
        "enterprise_mfa_policies",
        "enterprise_step_up_proofs",
        "enterprise_data_policies",
        "enterprise_retention_policies",
        "enterprise_legal_holds",
        "enterprise_data_subject_requests",
        "enterprise_governance_jobs",
        "enterprise_completion_manifests",
        "tenant_audit_events",
        "personal_todo",
    ] as const;

    private async tableExists(queryRunner: QueryRunner, table: string): Promise<boolean> {
        // QueryRunner.hasTable can inspect only the configured/default schema in
        // some TypeORM versions. Resolve the table in the active schema instead
        // of falling through to `public`; this keeps disposable-schema rehearsals
        // isolated from the application's tables in the public schema.
        const rows = await queryRunner.query(
            `SELECT to_regclass(format('%I.%I', current_schema(), $1::text)) IS NOT NULL AS exists`,
            [table],
        );
        return rows[0]?.exists === true || rows[0]?.exists === "t";
    }

    private async ensureTenantColumn(queryRunner: QueryRunner, table: string): Promise<boolean> {
        if (!(await this.tableExists(queryRunner, table))) return false;
        await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "tenant_id" UUID`);
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_${table.replace(/[^a-z0-9]/gi, "_")}_tenant" ON "${table}" ("tenant_id")`,
        );
        return true;
    }

    private async resolveAdministrator(queryRunner: QueryRunner): Promise<string | null> {
        if (!(await this.tableExists(queryRunner, "user"))) return null;

        // Exact matching is intentional: do not assign a similarly named account.
        const userColumns = await queryRunner.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = ANY (current_schemas(false)) AND table_name = 'user'
              AND column_name IN ('username', 'email', 'nickname', 'real_name')
        `);
        const identityColumns = userColumns.map((row: { column_name: string }) => row.column_name);
        if (identityColumns.length === 0) return null;
        const exact = await queryRunner.query(`
            SELECT "id"
            FROM "user"
            WHERE ${identityColumns.map((column) => `"${column}" = '谭建'`).join(" OR ")}
            ORDER BY "created_at" ASC NULLS LAST, "id" ASC
        `);
        // Only a unique exact match is authoritative. If multiple accounts
        // match, fall back to the deterministic legacy root selection below.
        if (exact.length === 1 && exact[0]?.id) {
            // A deployed schema may represent is_root as either the legacy
            // integer column or the boolean_number_enum. An unknown literal is
            // cast by PostgreSQL to whichever target type is present.
            await queryRunner.query(`UPDATE "user" SET "is_root" = '1' WHERE "id" = $1`, [
                exact[0].id,
            ]);
            return exact[0].id;
        }

        // Existing installations may not yet have the named account. Preserve the
        // legacy bootstrap behavior by selecting the oldest root account instead.
        const root = await queryRunner.query(`
            SELECT "id"
            FROM "user"
            WHERE "is_root"::text IN ('1', 'true')
            ORDER BY "created_at" ASC NULLS LAST, "id" ASC
            LIMIT 1
        `);
        return root[0]?.id ?? null;
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        // The preceding enterprise migration creates the tenant tables. Keep
        // this migration replayable on a clean database by creating the
        // minimal default-tenant table only when the expected table is absent.
        if (!(await this.tableExists(queryRunner, "tenants"))) {
            if (!(await this.tableExists(queryRunner, "user"))) return;
            await queryRunner.query(`
                CREATE TABLE IF NOT EXISTS "tenants" (
                    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "name" VARCHAR(120) NOT NULL,
                    "code" VARCHAR(80) NOT NULL UNIQUE,
                    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                    "owner_id" UUID NOT NULL REFERENCES "user"("id") ON DELETE RESTRICT,
                    "default_region" VARCHAR(32) DEFAULT 'default',
                    "plan_code" VARCHAR(32),
                    "suspended_at" TIMESTAMPTZ,
                    "suspended_by" UUID,
                    "suspension_reason" TEXT,
                    "policy_version" INTEGER NOT NULL DEFAULT 1,
                    "admin_user_id" UUID
                )
            `);
        }

        await queryRunner.query(
            `ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "admin_user_id" UUID`,
        );
        if (await this.tableExists(queryRunner, "user")) {
            await queryRunner.query(`
                DO $$ BEGIN
                    ALTER TABLE "tenants"
                        ADD CONSTRAINT "fk_tenants_admin_user"
                        FOREIGN KEY ("admin_user_id") REFERENCES "user"("id") ON DELETE RESTRICT;
                EXCEPTION WHEN duplicate_object THEN NULL;
                END $$;
            `);
        }
        await queryRunner.query(
            `CREATE INDEX IF NOT EXISTS "idx_tenants_admin_user" ON "tenants" ("admin_user_id")`,
        );

        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_migration_backfill_stats" (
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "table_name" VARCHAR(120) NOT NULL,
                "mapped_count" INTEGER NOT NULL DEFAULT 0,
                "quarantined_count" INTEGER NOT NULL DEFAULT 0,
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT "pk_tenant_migration_backfill_stats" PRIMARY KEY ("tenant_id", "table_name")
            )
        `);

        const administratorId = await this.resolveAdministrator(queryRunner);
        let defaultTenantId: string | null = null;

        if (administratorId) {
            const existing = await queryRunner.query(
                `SELECT "id" FROM "tenants" WHERE "code" = 'default' LIMIT 1`,
            );
            if (existing[0]?.id) {
                defaultTenantId = existing[0].id;
                await queryRunner.query(
                    `UPDATE "tenants" SET "admin_user_id" = $1, "owner_id" = $1, "status" = 'active' WHERE "id" = $2`,
                    [administratorId, defaultTenantId],
                );
            } else {
                const inserted = await queryRunner.query(
                    `INSERT INTO "tenants" ("id", "name", "code", "status", "owner_id", "admin_user_id")
                     VALUES (uuid_generate_v4(), 'Default tenant', 'default', 'active', $1, $1)
                     ON CONFLICT ("code") DO UPDATE SET "admin_user_id" = EXCLUDED."admin_user_id", "owner_id" = EXCLUDED."owner_id"
                     RETURNING "id"`,
                    [administratorId],
                );
                defaultTenantId = inserted[0]?.id ?? null;
            }
        }

        // Every existing tenant must have a concrete administrator under the
        // simplified model. Preserve the legacy owner as that administrator
        // until an explicit assignment changes it; the default tenant is
        // overwritten above with the deterministic 谭建 account.
        await queryRunner.query(`
            UPDATE "tenants"
            SET "admin_user_id" = "owner_id"
            WHERE "admin_user_id" IS NULL AND "owner_id" IS NOT NULL
        `);

        // Add the tenant boundary to every known tenant-owned table. Existing
        // nullable columns remain compatible with old writers until the API gate
        // is enabled, but all legacy rows are reconciled below.
        for (const table of this.tenantOwnedTables)
            await this.ensureTenantColumn(queryRunner, table);

        if (!defaultTenantId) return;

        if (await this.tableExists(queryRunner, "tenant_memberships")) {
            await queryRunner.query(
                `
                INSERT INTO "tenant_memberships" ("id", "tenant_id", "user_id", "role_code", "status", "accepted_at")
                SELECT uuid_generate_v4(), $1, u."id",
                       CASE WHEN u."id" = $2 THEN 'admin' ELSE 'member' END,
                       'active', now()
                FROM "user" u
                ON CONFLICT ("tenant_id", "user_id") DO UPDATE
                    SET "status" = 'active',
                        "role_code" = CASE WHEN "tenant_memberships"."user_id" = $2 THEN 'admin' ELSE 'member' END,
                        "accepted_at" = COALESCE("tenant_memberships"."accepted_at", now())
            `,
                [defaultTenantId, administratorId],
            );
        }

        for (const table of this.tenantOwnedTables) {
            if (!(await this.tableExists(queryRunner, table))) continue;
            await queryRunner.query(
                // This is the one-time cutover requested for the existing
                // installation: every legacy business record, including rows
                // carrying an earlier demo tenant id, becomes part of the
                // default tenant. New records created after this migration are
                // scoped by the API and are not affected by this statement.
                `UPDATE "${table}" SET "tenant_id" = $1`,
                [defaultTenantId],
            );
            const mappedRows = await queryRunner.query(
                `SELECT count(*)::int AS count FROM "${table}" WHERE "tenant_id" = $1`,
                [defaultTenantId],
            );
            const orphanRows = await queryRunner.query(
                `SELECT count(*)::int AS count FROM "${table}" WHERE "tenant_id" IS NULL`,
            );
            await queryRunner.query(
                `INSERT INTO "tenant_migration_backfill_stats" ("tenant_id", "table_name", "mapped_count", "quarantined_count", "updated_at")
                 VALUES ($1, $2, $3, $4, now())
                 ON CONFLICT ("tenant_id", "table_name") DO UPDATE
                    SET "mapped_count" = EXCLUDED."mapped_count",
                        "quarantined_count" = EXCLUDED."quarantined_count",
                        "updated_at" = now()`,
                [
                    defaultTenantId,
                    table,
                    Number(mappedRows[0]?.count ?? 0),
                    Number(orphanRows[0]?.count ?? 0),
                ],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // The migration is additive and data-bearing. Do not delete the default
        // tenant or tenant ownership on rollback; remove only the compatibility
        // column/index introduced by this migration when it is safe to do so.
        if (!(await this.tableExists(queryRunner, "tenants"))) return;
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenants_admin_user"`);
        await queryRunner.query(
            `ALTER TABLE "tenants" DROP CONSTRAINT IF EXISTS "fk_tenants_admin_user"`,
        );
        await queryRunner.query(`ALTER TABLE "tenants" DROP COLUMN IF EXISTS "admin_user_id"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_migration_backfill_stats"`);
    }
}
