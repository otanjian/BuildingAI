import "reflect-metadata";

jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { getMetadataArgsStorage, type QueryRunner } from "@buildingai/db/typeorm";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPOSITORY_ROOT = resolve(__dirname, "../../../../..");
const ENTITY_PATH = resolve(
    REPOSITORY_ROOT,
    "packages/@buildingai/db/src/entities/personal-todo.entity.ts",
);
const MIGRATION_PATH = resolve(
    REPOSITORY_ROOT,
    "packages/@buildingai/db/src/migrations/1787443200000-26.1.5-add-personal-todo-center.ts",
);

type Constructor = new (...args: never[]) => object;

function requireCreatedModule<T>(path: string): T | undefined {
    const exists = existsSync(path);
    expect(exists).toBe(true);
    if (!exists) return undefined;
    return require(path) as T;
}

function normalizeSql(sql: string): string {
    return sql.replace(/\s+/g, " ").trim().toLowerCase();
}

describe("personal todo schema", () => {
    it("uses an opaque UUID identity and soft deletion", () => {
        const module = requireCreatedModule<{ PersonalTodo: Constructor }>(ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const table = storage.tables.find((entry) => entry.target === module.PersonalTodo);
        const baseEntity = Object.getPrototypeOf(module.PersonalTodo.prototype).constructor;
        const rootEntity = Object.getPrototypeOf(baseEntity.prototype).constructor;
        const idColumn = storage.columns.find(
            (entry) => entry.target === rootEntity && entry.propertyName === "id",
        );
        const deletedAt = storage.columns.find(
            (entry) => entry.target === baseEntity && entry.propertyName === "deletedAt",
        );

        expect(table?.name).toBe("personal_todo");
        expect(baseEntity.name).toBe("SoftDeleteBaseEntity");
        expect(idColumn?.options).toMatchObject({ primary: true, type: "uuid" });
        expect(deletedAt?.mode).toBe("deleteDate");
    });

    it("defines accountable relations, date-only planning, and lifecycle fields", () => {
        const module = requireCreatedModule<{ PersonalTodo: Constructor }>(ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const columns = storage
            .filterColumns(module.PersonalTodo)
            .reduce<Record<string, Record<string, unknown>>>((result, column) => {
                result[column.propertyName] = column.options as Record<string, unknown>;
                return result;
            }, {});
        const relations = storage.filterRelations(module.PersonalTodo);
        const joins = storage.joinColumns.filter((entry) => entry.target === module.PersonalTodo);

        expect(columns).toMatchObject({
            title: { type: "text", nullable: false },
            description: { type: "text", nullable: true },
            creatorId: { type: "uuid", nullable: false },
            assigneeId: { type: "uuid", nullable: false },
            plannedCompletionDate: { type: "date", nullable: true },
            progress: { type: "integer", nullable: false, default: 0 },
            status: { type: "text", nullable: false, default: "in_progress" },
            completedAt: { type: "timestamptz", nullable: true },
        });
        expect(relations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ propertyName: "creator", options: { onDelete: "RESTRICT" } }),
                expect.objectContaining({ propertyName: "assignee", options: { onDelete: "RESTRICT" } }),
            ]),
        );
        expect(joins).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ propertyName: "creator", name: "creator_id" }),
                expect.objectContaining({ propertyName: "assignee", name: "assignee_id" }),
            ]),
        );
    });

    it("declares progress, status, lifecycle, title, and scoped-query invariants", () => {
        const module = requireCreatedModule<{ PersonalTodo: Constructor }>(ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const checks = storage.filterChecks(module.PersonalTodo);
        const indices = storage.filterIndices(module.PersonalTodo);

        expect(checks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ name: "ck_personal_todo_title", expression: expect.stringMatching(/LENGTH.*TRIM.*title/) }),
                expect.objectContaining({ name: "ck_personal_todo_progress", expression: expect.stringMatching(/progress.*0.*100/) }),
                expect.objectContaining({ name: "ck_personal_todo_status", expression: expect.stringMatching(/in_progress.*completed/) }),
                expect.objectContaining({
                    name: "ck_personal_todo_lifecycle",
                    expression: expect.stringMatching(/in_progress[\s\S]*progress[\s\S]*100[\s\S]*completed_at[\s\S]*completed/),
                }),
            ]),
        );
        expect(indices).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "idx_personal_todo_creator_active",
                    columns: ["creatorId", "status", "plannedCompletionDate"],
                    where: expect.stringMatching(/deleted_at.*NULL/),
                }),
                expect.objectContaining({
                    name: "idx_personal_todo_assignee_active",
                    columns: ["assigneeId", "status", "plannedCompletionDate"],
                    where: expect.stringMatching(/deleted_at.*NULL/),
                }),
            ]),
        );
    });
});

describe("personal todo migration", () => {
    it("creates the schema idempotently and rolls back without touching unrelated data", async () => {
        const module = requireCreatedModule<{
            Migration1787443200000: new () => {
                up(queryRunner: QueryRunner): Promise<void>;
                down(queryRunner: QueryRunner): Promise<void>;
            };
        }>(MIGRATION_PATH);
        if (!module) return;

        const sql: string[] = [];
        const queryRunner = {
            query: jest.fn(async (statement: string) => {
                sql.push(normalizeSql(statement));
                return [];
            }),
        } as unknown as QueryRunner;
        const migration = new module.Migration1787443200000();

        await migration.up(queryRunner);
        await migration.up(queryRunner);
        await migration.down(queryRunner);

        const combined = sql.join("\n");
        expect(combined).toContain('create table if not exists "personal_todo"');
        expect(combined).toContain('create index if not exists "idx_personal_todo_creator_active"');
        expect(combined).toContain('create index if not exists "idx_personal_todo_assignee_active"');
        expect(combined).toContain('drop table if exists "personal_todo"');
        expect(combined).not.toMatch(/drop table if exists "(user|config)"/);
    });

    it("adds the stable menu once without reordering customized entries", () => {
        const module = requireCreatedModule<{
            TODO_MENU_ID: string;
            addPersonalTodoMenu(config: { menus: Array<{ id: string; title?: string }> }): boolean;
        }>(MIGRATION_PATH);
        if (!module) return;
        const config = {
            menus: [
                { id: "custom-first", title: "Custom" },
                { id: "menu_history_fixed", title: "History" },
                { id: "custom-last", title: "Another" },
            ],
        };

        expect(module.addPersonalTodoMenu(config)).toBe(true);
        expect(module.addPersonalTodoMenu(config)).toBe(false);
        expect(config.menus.map((item) => item.id)).toEqual([
            "custom-first",
            module.TODO_MENU_ID,
            "menu_history_fixed",
            "custom-last",
        ]);
        expect(config.menus[0]).toEqual({ id: "custom-first", title: "Custom" });
        expect(config.menus[3]).toEqual({ id: "custom-last", title: "Another" });
    });

    it("ships the same stable menu in the fresh-install seed", () => {
        const seed = require(resolve(REPOSITORY_ROOT, "packages/@buildingai/db/src/seeds/data/web-menu.json")) as {
            menus: Array<{ id: string; link: { path: string } }>;
        };
        expect(seed.menus.filter((item) => item.id === "menu_personal_todos")).toEqual([
            expect.objectContaining({
                id: "menu_personal_todos",
                link: expect.objectContaining({ path: "/todos" }),
            }),
        ]);
    });
});
