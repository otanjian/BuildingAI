import type { MigrationInterface, QueryRunner } from "../typeorm";

/** Hide the evaluation/readiness page from workspace navigation without revoking access. */
export class HideAiEvaluationMenu1789200000000 implements MigrationInterface {
    name = "HideAiEvaluationMenu1789200000000";

    async up(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("menus"))) return;
        await queryRunner.query(
            `UPDATE "menus" SET "isHidden" = 1, "updated_at" = now() WHERE "code" = 'ai-evaluation'`,
        );
    }

    async down(queryRunner: QueryRunner): Promise<void> {
        if (!(await queryRunner.hasTable("menus"))) return;
        await queryRunner.query(
            `UPDATE "menus" SET "isHidden" = 0, "updated_at" = now() WHERE "code" = 'ai-evaluation'`,
        );
    }
}
