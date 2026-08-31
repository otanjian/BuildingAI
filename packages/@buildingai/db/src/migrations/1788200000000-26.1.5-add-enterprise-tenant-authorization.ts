import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Compatibility-first tenant boundary migration.
 *
 * The new columns intentionally remain nullable. The API enables the write gate after
 * legacy rows have been reconciled by TenantMigrationService.
 */
export class Migration1788200000000 implements MigrationInterface {
    name = "Migration1788200000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenants" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "name" VARCHAR(120) NOT NULL,
                "code" VARCHAR(80) NOT NULL,
                "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                "owner_id" UUID NOT NULL,
                "default_region" VARCHAR(32) DEFAULT 'default',
                "plan_code" VARCHAR(32),
                "suspended_at" TIMESTAMPTZ,
                "suspended_by" UUID,
                "suspension_reason" TEXT,
                "policy_version" INTEGER NOT NULL DEFAULT 1,
                CONSTRAINT "pk_tenants" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenants_code" UNIQUE ("code"),
                CONSTRAINT "fk_tenants_owner" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT,
                CONSTRAINT "ck_tenants_status" CHECK ("status" IN ('active', 'suspended', 'pending', 'archived'))
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_organizations" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "name" VARCHAR(120) NOT NULL,
                "code" VARCHAR(80) NOT NULL,
                "parent_id" UUID,
                "level" INTEGER NOT NULL DEFAULT 1,
                "enabled" BOOLEAN NOT NULL DEFAULT true,
                CONSTRAINT "pk_tenant_organizations" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenant_organizations_code" UNIQUE ("tenant_id", "code")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_projects" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "name" VARCHAR(120) NOT NULL,
                "code" VARCHAR(80) NOT NULL,
                "status" VARCHAR(32) NOT NULL DEFAULT 'active',
                "owner_id" UUID,
                "expires_at" TIMESTAMPTZ,
                CONSTRAINT "pk_tenant_projects" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenant_projects_code" UNIQUE ("tenant_id", "code")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_roles" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "code" VARCHAR(40) NOT NULL,
                "name" VARCHAR(120) NOT NULL,
                "description" TEXT,
                "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "is_system" BOOLEAN NOT NULL DEFAULT false,
                "enabled" BOOLEAN NOT NULL DEFAULT true,
                CONSTRAINT "pk_tenant_roles" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenant_roles_code" UNIQUE ("tenant_id", "code")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_memberships" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "user_id" UUID REFERENCES "user"("id") ON DELETE CASCADE,
                "organization_id" UUID REFERENCES "tenant_organizations"("id") ON DELETE SET NULL,
                "project_id" UUID REFERENCES "tenant_projects"("id") ON DELETE SET NULL,
                "role_code" VARCHAR(40) NOT NULL,
                "status" VARCHAR(24) NOT NULL DEFAULT 'active',
                "invitation_email" VARCHAR(255),
                "invited_at" TIMESTAMPTZ,
                "accepted_at" TIMESTAMPTZ,
                "expires_at" TIMESTAMPTZ,
                "created_by" UUID,
                "updated_by" UUID,
                "attributes" JSONB NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_tenant_memberships" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenant_memberships_user" UNIQUE ("tenant_id", "user_id"),
                CONSTRAINT "ck_tenant_memberships_status" CHECK ("status" IN ('invited', 'active', 'suspended', 'expired', 'revoked')),
                CONSTRAINT "ck_tenant_memberships_subject" CHECK ("user_id" IS NOT NULL OR "invitation_email" IS NOT NULL)
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_resource_grants" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
                "project_id" UUID REFERENCES "tenant_projects"("id") ON DELETE CASCADE,
                "resource_type" VARCHAR(80) NOT NULL,
                "resource_id" UUID NOT NULL,
                "subject_type" VARCHAR(16) NOT NULL,
                "subject_id" UUID NOT NULL,
                "role_code" VARCHAR(40),
                "actions" JSONB NOT NULL DEFAULT '[]'::jsonb,
                "conditions" JSONB NOT NULL DEFAULT '{}'::jsonb,
                "policy_version" INTEGER NOT NULL DEFAULT 1,
                "expires_at" TIMESTAMPTZ,
                "created_by" UUID,
                "revoked_by" UUID,
                "revoked_at" TIMESTAMPTZ,
                CONSTRAINT "pk_tenant_resource_grants" PRIMARY KEY ("id"),
                CONSTRAINT "uq_tenant_resource_grants_subject" UNIQUE ("tenant_id", "resource_type", "resource_id", "subject_type", "subject_id", "project_id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "tenant_audit_events" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
                "tenant_id" UUID REFERENCES "tenants"("id") ON DELETE SET NULL,
                "actor_id" UUID REFERENCES "user"("id") ON DELETE SET NULL,
                "action" VARCHAR(80) NOT NULL,
                "outcome" VARCHAR(32) NOT NULL,
                "resource_type" VARCHAR(80),
                "resource_id" UUID,
                "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
                CONSTRAINT "pk_tenant_audit_events" PRIMARY KEY ("id")
            )
        `);

        const scopedTables: Array<{ table: string; owner?: string }> = [
            { table: "ai_agent", owner: "create_by" },
            { table: "datasets", owner: "created_by" },
            { table: "ai_agent_chat_record", owner: "user_id" },
            { table: "ai_chat_record", owner: "user_id" },
            { table: "automation_job", owner: "creator_id" },
            { table: "automation_run" },
            { table: "automation_dispatch" },
            { table: "ai_mcp_servers", owner: "creator_id" },
            { table: "secret_config" },
            { table: "account_log", owner: "user_id" },
            { table: "analyse", owner: "user_id" },
            { table: "channel_account" },
        ];

        for (const item of scopedTables) {
            if (!(await queryRunner.hasTable(item.table))) continue;
            await queryRunner.query(`ALTER TABLE "${item.table}" ADD COLUMN IF NOT EXISTS "tenant_id" UUID`);
            await queryRunner.query(`ALTER TABLE "${item.table}" ADD COLUMN IF NOT EXISTS "project_id" UUID`);
            await queryRunner.query(
                `CREATE INDEX IF NOT EXISTS "idx_${item.table.replace(/[^a-z0-9]/gi, "_")}_tenant_project" ON "${item.table}" ("tenant_id", "project_id")`,
            );
        }

        // Seed a deterministic tenant only when a root user exists. Existing rows are then
        // mapped to this tenant and can be reconciled before the non-null write gate is enabled.
        await queryRunner.query(`
            INSERT INTO "tenants" ("id", "name", "code", "status", "owner_id")
            SELECT uuid_generate_v4(), 'Default tenant', 'default', 'active', u."id"
            FROM "user" u
            WHERE u."is_root"::text IN ('1', 'true')
            ORDER BY u."created_at" ASC
            LIMIT 1
            ON CONFLICT ("code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "tenant_organizations" ("id", "tenant_id", "name", "code")
            SELECT uuid_generate_v4(), t."id", 'Default organization', 'default'
            FROM "tenants" t
            WHERE t."code" = 'default'
            ON CONFLICT ("tenant_id", "code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "tenant_projects" ("id", "tenant_id", "name", "code", "owner_id")
            SELECT uuid_generate_v4(), t."id", 'Default project', 'default', t."owner_id"
            FROM "tenants" t
            WHERE t."code" = 'default'
            ON CONFLICT ("tenant_id", "code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "tenant_roles" ("id", "tenant_id", "code", "name", "permissions", "is_system")
            SELECT uuid_generate_v4(), t."id", r.code, r.name, r.permissions, true
            FROM "tenants" t
            CROSS JOIN (VALUES
                ('owner', 'Tenant owner', '["*"]'::jsonb),
                ('admin', 'Tenant administrator', '["tenant:*"]'::jsonb),
                ('editor', 'Project editor', '["resource:read", "resource:create", "resource:update"]'::jsonb),
                ('member', 'Member', '["resource:read", "resource:execute"]'::jsonb),
                ('viewer', 'Viewer', '["resource:read"]'::jsonb)
            ) AS r(code, name, permissions)
            WHERE t."code" = 'default'
            ON CONFLICT ("tenant_id", "code") DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "tenant_memberships" ("id", "tenant_id", "user_id", "organization_id", "project_id", "role_code", "status", "accepted_at")
            SELECT uuid_generate_v4(), t."id", t."owner_id", o."id", p."id", 'owner', 'active', now()
            FROM "tenants" t
            LEFT JOIN "tenant_organizations" o ON o."tenant_id" = t."id" AND o."code" = 'default'
            LEFT JOIN "tenant_projects" p ON p."tenant_id" = t."id" AND p."code" = 'default'
            WHERE t."code" = 'default'
            ON CONFLICT ("tenant_id", "user_id") DO NOTHING
        `);

        for (const item of scopedTables) {
            if (!(await queryRunner.hasTable(item.table))) continue;
            const ownerCondition = item.owner
                ? `AND EXISTS (SELECT 1 FROM "user" u WHERE u."id"::text = "${item.table}"."${item.owner}"::text)`
                : "";
            await queryRunner.query(`
                UPDATE "${item.table}"
                SET "tenant_id" = (SELECT "id" FROM "tenants" WHERE "code" = 'default'),
                    "project_id" = (SELECT "id" FROM "tenant_projects" WHERE "tenant_id" = (SELECT "id" FROM "tenants" WHERE "code" = 'default') AND "code" = 'default')
                WHERE "tenant_id" IS NULL ${ownerCondition}
            `);
        }

        const permissions = [
            ["tenant:list", "查看租户"],
            ["tenant:members:list", "查看租户成员"],
            ["tenant:members:create", "邀请租户成员"],
            ["tenant:members:update", "变更租户成员"],
            ["tenant:projects:list", "查看租户项目"],
            ["tenant:projects:create", "创建租户项目"],
            ["tenant:roles:list", "查看租户角色"],
            ["tenant:permissions:read", "查看生效权限"],
            ["tenant:grants:create", "授予项目资源权限"],
        ];
        for (const [code, name] of permissions) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
                 VALUES (uuid_generate_v4(), $1, $2, $2, 'tenant', '租户管理', 'system', false, now(), now())
                 ON CONFLICT ("code") DO NOTHING`,
                [code, name],
            );
        }
        await queryRunner.query(`
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            SELECT r."id", p."id"
            FROM "roles" r CROSS JOIN "permissions" p
            WHERE p."code" LIKE 'tenant:%'
            ON CONFLICT DO NOTHING
        `);
        await queryRunner.query(`
            INSERT INTO "menus" (
                "id", "name", "code", "path", "icon", "component", "permissionCode",
                "parentId", "sort", "isHidden", "type", "sourceType", "created_at", "updated_at"
            )
            SELECT uuid_generate_v4(), '租户管理', 'tenant', 'tenant', 'building-2', '/console/tenant/index', 'tenant:list', parent."id",
                   650, 0, 2, 1, now(), now()
            FROM "menus" parent
            WHERE parent."code" = 'system-manage'
            ON CONFLICT ("code") DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "menus" WHERE "code" = 'tenant'`);
        await queryRunner.query(`DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "code" LIKE 'tenant:%')`);
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" LIKE 'tenant:%'`);
        const tables = [
            "ai_agent", "datasets", "ai_agent_chat_record", "ai_chat_record", "automation_job",
            "automation_run", "automation_dispatch", "ai_mcp_servers", "secret_config",
            "account_log", "analyse", "channel_account",
        ];
        for (const table of tables) {
            if (!(await queryRunner.hasTable(table))) continue;
            await queryRunner.query(`DROP INDEX IF EXISTS "idx_${table.replace(/[^a-z0-9]/gi, "_")}_tenant_project"`);
            await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "project_id"`);
            await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "tenant_id"`);
        }
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_audit_events"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_resource_grants"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_memberships"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_roles"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_projects"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenant_organizations"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    }
}
