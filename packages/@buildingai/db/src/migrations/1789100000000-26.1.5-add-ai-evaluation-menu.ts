import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Expose the tenant-scoped evaluation/readiness dashboard in the workspace menu. */
export class AddAiEvaluationMenu1789100000000 implements MigrationInterface {
    name = "AddAiEvaluationMenu1789100000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("menus")) || !(await queryRunner.hasTable("permissions")))
            return;
        await queryRunner.query(`
            INSERT INTO "permissions" ("id", "code", "name", "description", "group", "group_name", "type", "is_deprecated", "created_at", "updated_at")
            SELECT uuid_generate_v4(), 'evaluation:dashboard', '查看评估与生产就绪', '评估数据集、运行状态与生产门禁', 'evaluation', 'AI 评估', 'system', false, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "permissions" WHERE "code" = 'evaluation:dashboard')
        `);
        await queryRunner.query(`
            INSERT INTO "menus" ("id", "name", "code", "path", "icon", "component", "permissionCode", "parentId", "sort", "isHidden", "type", "sourceType", "created_at", "updated_at")
            SELECT uuid_generate_v4(), '评估与生产就绪', 'ai-evaluation', 'evaluation', 'flask-conical', '/console/evaluation', 'evaluation:dashboard', parent."id", 250, 0, 2, 1, now(), now()
            FROM "menus" parent
            WHERE parent."code" = 'workspace'
              AND NOT EXISTS (SELECT 1 FROM "menus" WHERE "code" = 'ai-evaluation')
        `);
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "menus" WHERE "code" = 'ai-evaluation'`);
        await queryRunner.query(`DELETE FROM "permissions" WHERE "code" = 'evaluation:dashboard'`);
    }
}
