import "reflect-metadata";

jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { getMetadataArgsStorage, type QueryRunner } from "@buildingai/db/typeorm";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ENTITY_PATH = resolve(
    __dirname,
    "../../../../../../../packages/@buildingai/db/src/entities/ai-agent-opencode-turn.entity.ts",
);
const MIGRATION_PATH = resolve(
    __dirname,
    "../../../../../../../packages/@buildingai/db/src/migrations/1787356800000-26.1.5-add-opencode-live-projection.ts",
);

describe("OpenCode live projection schema", () => {
    it("declares recoverable projection columns", () => {
        const { AgentOpencodeTurn } = require(ENTITY_PATH) as {
            AgentOpencodeTurn: new () => object;
        };
        const columns = getMetadataArgsStorage()
            .filterColumns(AgentOpencodeTurn)
            .reduce<Record<string, Record<string, unknown>>>((result, column) => {
                result[column.propertyName] = column.options as Record<string, unknown>;
                return result;
            }, {});

        expect(columns).toMatchObject({
            liveProjection: { type: "jsonb", nullable: true },
            projectionVersion: { type: "bigint", nullable: false, default: "0" },
            projectionUpdatedAt: { type: "timestamptz", nullable: true },
        });
    });

    it("adds idempotent fields and a non-negative version check", async () => {
        expect(existsSync(MIGRATION_PATH)).toBe(true);
        if (!existsSync(MIGRATION_PATH)) return;
        const module = require(MIGRATION_PATH) as {
            Migration1787356800000: new () => {
                up(queryRunner: QueryRunner): Promise<void>;
                down(queryRunner: QueryRunner): Promise<void>;
            };
        };
        const sql: string[] = [];
        const runner = { query: jest.fn(async (statement: string) => sql.push(statement)) };
        await new module.Migration1787356800000().up(runner as unknown as QueryRunner);
        const joined = sql.join("\n").replace(/\s+/g, " ");
        expect(joined).toMatch(/ADD COLUMN IF NOT EXISTS "live_projection" JSONB/);
        expect(joined).toMatch(
            /ADD COLUMN IF NOT EXISTS "projection_version" BIGINT NOT NULL DEFAULT 0/,
        );
        expect(joined).toMatch(/ADD COLUMN IF NOT EXISTS "projection_updated_at" TIMESTAMP WITH TIME ZONE/);
        expect(joined).toMatch(/ck_oc_turn_projection_version.*"projection_version" >= 0/);
    });
});
