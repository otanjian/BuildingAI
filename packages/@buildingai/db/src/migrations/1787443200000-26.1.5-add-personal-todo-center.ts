import type { MigrationInterface, QueryRunner } from "typeorm";

export const TODO_MENU_ID = "menu_personal_todos";
export const TODO_MENU = {
    id: TODO_MENU_ID,
    icon: "list-checks",
    title: "我的待办",
    link: {
        label: "我的待办",
        path: "/todos",
        type: "system",
        query: {},
        component: "/src/pages/todos/index.tsx",
        target: "_self",
    },
};

export interface PersonalTodoMenuConfig {
    menus?: Array<{ id?: string; [key: string]: unknown }>;
    [key: string]: unknown;
}

export function addPersonalTodoMenu(config: PersonalTodoMenuConfig): boolean {
    if (!Array.isArray(config?.menus)) return false;
    if (config.menus.some((item) => item.id === TODO_MENU_ID)) return false;
    const historyIndex = config.menus.findIndex((item) => item.id === "menu_history_fixed");
    config.menus.splice(historyIndex >= 0 ? historyIndex : config.menus.length, 0, TODO_MENU);
    return true;
}

export function removePersonalTodoMenu(config: PersonalTodoMenuConfig): boolean {
    if (!Array.isArray(config?.menus)) return false;
    const next = config.menus.filter((item) => item.id !== TODO_MENU_ID);
    if (next.length === config.menus.length) return false;
    config.menus = next;
    return true;
}

export class Migration1787443200000 implements MigrationInterface {
    name = "Migration1787443200000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "personal_todo" (
                "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
                "title" TEXT NOT NULL,
                "description" TEXT,
                "creator_id" UUID NOT NULL,
                "assignee_id" UUID NOT NULL,
                "planned_completion_date" DATE,
                "progress" INTEGER NOT NULL DEFAULT 0,
                "status" TEXT NOT NULL DEFAULT 'in_progress',
                "completed_at" TIMESTAMP WITH TIME ZONE,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "deleted_at" TIMESTAMP WITH TIME ZONE,
                CONSTRAINT "pk_personal_todo" PRIMARY KEY ("id")
            )
        `);
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_personal_todo_title",
            `CHECK (LENGTH(TRIM("title")) BETWEEN 1 AND 200)`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_personal_todo_progress",
            `CHECK ("progress" BETWEEN 0 AND 100)`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_personal_todo_status",
            `CHECK ("status" IN ('in_progress', 'completed'))`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "ck_personal_todo_lifecycle",
            `CHECK (
                ("status" = 'in_progress' AND "progress" < 100 AND "completed_at" IS NULL)
                OR
                ("status" = 'completed' AND "progress" = 100 AND "completed_at" IS NOT NULL)
            )`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "fk_personal_todo_creator",
            `FOREIGN KEY ("creator_id") REFERENCES "user"("id") ON DELETE RESTRICT`,
        );
        await this.addConstraintIfMissing(
            queryRunner,
            "fk_personal_todo_assignee",
            `FOREIGN KEY ("assignee_id") REFERENCES "user"("id") ON DELETE RESTRICT`,
        );
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_personal_todo_creator_active"
            ON "personal_todo" ("creator_id", "status", "planned_completion_date")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_personal_todo_assignee_active"
            ON "personal_todo" ("assignee_id", "status", "planned_completion_date")
            WHERE "deleted_at" IS NULL
        `);
        await queryRunner.query(`COMMENT ON TABLE "personal_todo" IS 'Personal todo'`);
        await this.patchMenu(queryRunner, "add");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.patchMenu(queryRunner, "remove");
        await queryRunner.query(`DROP TABLE IF EXISTS "personal_todo"`);
    }

    private async addConstraintIfMissing(
        queryRunner: QueryRunner,
        constraint: string,
        definition: string,
    ): Promise<void> {
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = '${constraint}'
                      AND conrelid = '"personal_todo"'::regclass
                ) THEN
                    ALTER TABLE "personal_todo" ADD CONSTRAINT "${constraint}" ${definition};
                END IF;
            END
            $$
        `);
    }

    private async patchMenu(queryRunner: QueryRunner, mode: "add" | "remove"): Promise<void> {
        let rows: Array<{ id: string; value: string }> = [];
        try {
            rows = await queryRunner.query(
                `SELECT "id", "value" FROM "config" WHERE "key" = $1 AND "group" = $2 LIMIT 1`,
                ["menu-config", "decorate"],
            );
        } catch {
            return;
        }
        const row = rows[0];
        if (!row) return;
        try {
            const config = JSON.parse(row.value) as PersonalTodoMenuConfig;
            const changed = mode === "add" ? addPersonalTodoMenu(config) : removePersonalTodoMenu(config);
            if (!changed) return;
            await queryRunner.query(`UPDATE "config" SET "value" = $1, "updated_at" = now() WHERE "id" = $2`, [
                JSON.stringify(config),
                row.id,
            ]);
        } catch {
            // Preserve invalid or non-JSON administrator configuration.
        }
    }
}
