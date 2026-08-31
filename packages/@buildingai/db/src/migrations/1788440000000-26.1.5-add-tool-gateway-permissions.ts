import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Seed the complete gateway permission set so operation-level controls are assignable. */
export class AddToolGatewayPermissions1788440000000 implements MigrationInterface {
    name = "AddToolGatewayPermissions1788440000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("permissions"))) return;
        await queryRunner.query(`
            INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
            SELECT uuid_generate_v4(), item.code, item.name, 'Tool Gateway', 'tool-gateway', '工具网关', 'system', false, now(), now()
            FROM (VALUES
                ('tool-gateway:list', '查看工具注册'),
                ('tool-gateway:register', '注册工具'),
                ('tool-gateway:disable', '禁用工具'),
                ('tool-gateway:emergency', '紧急禁用工具网关'),
                ('tool-gateway:approvals:list', '查看工具审批'),
                ('tool-gateway:approvals:create', '申请工具审批'),
                ('tool-gateway:approvals:decide', '处理工具审批'),
                ('tool-gateway:executions:list', '查看工具执行记录'),
                ('tool-gateway:metrics:list', '查看工具网关指标'),
                ('tool-gateway:execute', '测试工具执行')
            ) AS item(code, name)
            WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."code" = item.code)
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" LIKE 'tool-gateway:%'`);
    }
}
