import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Expose the audit/cost governance dashboard from the system-management menu. */
export class AddAuditGovernanceMenu1789000000000 implements MigrationInterface {
    name = "AddAuditGovernanceMenu1789000000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("menus")) || !(await queryRunner.hasTable("permissions"))) return;
        await queryRunner.query(`
            INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
            SELECT uuid_generate_v4(), 'audit:dashboard', '查看审计与成本概览', '审计与成本治理', 'audit', '审计与成本治理', 'system', false, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'audit:dashboard')
        `);
        await queryRunner.query(`
            INSERT INTO "menus" ("id", "name", "code", "path", "icon", "component", "permissionCode", "parentId", "sort", "isHidden", "type", "sourceType", "created_at", "updated_at")
            SELECT uuid_generate_v4(), '审计与成本治理', 'audit-governance', 'audit', 'shield-check', '/console/audit', 'audit:dashboard', parent."id", 1200, 0, 2, 1, now(), now()
            FROM "menus" parent
            WHERE parent."code" = 'system-manage'
              AND NOT EXISTS (SELECT 1 FROM "menus" WHERE "code" = 'audit-governance')
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "menus" WHERE "code" = 'audit-governance'`);
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'audit:dashboard'`);
    }
}
