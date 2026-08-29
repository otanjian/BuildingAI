import type { MigrationInterface, QueryRunner } from "typeorm";

const AUTOMATION_MENU_ID = "menu_automations";
const AUTOMATION_MENU = {
    id: AUTOMATION_MENU_ID,
    icon: "calendar-clock",
    title: "定时任务",
    link: {
        label: "定时任务",
        path: "/automations",
        type: "system",
        query: {},
        component: "/src/pages/automations/index.tsx",
        target: "_self",
    },
};

type MenuConfig = {
    menus?: Array<{ id?: string; [key: string]: unknown }>;
    [key: string]: unknown;
};

/** Add the creator-facing automation entry to existing installations. */
export class Migration1787529600001 implements MigrationInterface {
    name = "Migration1787529600001";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.patchMenu(queryRunner, "add");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await this.patchMenu(queryRunner, "remove");
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
            const config = JSON.parse(row.value) as MenuConfig;
            const menus = Array.isArray(config.menus) ? config.menus : [];
            const changed = mode === "add"
                ? !menus.some((item) => item.id === AUTOMATION_MENU_ID) && (() => {
                    const homeIndex = menus.findIndex((item) => item.id === "menu_home_fixed");
                    menus.splice(homeIndex >= 0 ? homeIndex + 1 : 0, 0, AUTOMATION_MENU);
                    return true;
                })()
                : (() => {
                    const next = menus.filter((item) => item.id !== AUTOMATION_MENU_ID);
                    if (next.length === menus.length) return false;
                    config.menus = next;
                    return true;
                })();
            if (!changed) return;
            if (mode === "add") config.menus = menus;
            await queryRunner.query(
                `UPDATE "config" SET "value" = $1, "updated_at" = now() WHERE "id" = $2`,
                [JSON.stringify(config), row.id],
            );
        } catch {
            // Preserve invalid or administrator-managed configuration.
        }
    }
}
