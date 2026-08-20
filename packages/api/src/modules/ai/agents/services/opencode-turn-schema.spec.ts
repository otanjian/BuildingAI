import "reflect-metadata";

jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { AgentChatRecord } from "@buildingai/db/entities/ai-agent-chat-record.entity";
import { getMetadataArgsStorage, type QueryRunner } from "@buildingai/db/typeorm";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPOSITORY_ROOT = resolve(__dirname, "../../../../../../..");
const TURN_ENTITY_PATH = resolve(
    REPOSITORY_ROOT,
    "packages/@buildingai/db/src/entities/ai-agent-opencode-turn.entity.ts",
);
const MIGRATION_PATH = resolve(
    REPOSITORY_ROOT,
    "packages/@buildingai/db/src/migrations/1787270400000-26.1.5-add-opencode-turn-consistency.ts",
);

type Constructor = new (...args: never[]) => object;

function requireCreatedModule<T>(path: string): T | undefined {
    const exists = existsSync(path);
    expect(exists).toBe(true);
    if (!exists) {
        return undefined;
    }
    return require(path) as T;
}

function normalizeSql(sql: string): string {
    return sql.replace(/\s+/g, " ").trim();
}

describe("OpenCode durable turn schema", () => {
    it("models the client turn UUID as the durable idempotency key", () => {
        const module = requireCreatedModule<{
            AgentOpencodeTurn: Constructor;
        }>(TURN_ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const table = storage.tables.find((entry) => entry.target === module.AgentOpencodeTurn);
        const baseEntity = Object.getPrototypeOf(module.AgentOpencodeTurn.prototype).constructor;
        const idColumn = storage.columns.find(
            (entry) => entry.target === baseEntity && entry.propertyName === "id",
        );

        expect(table?.name).toBe("ai_agent_opencode_turn");
        expect(baseEntity.name).toBe("BaseEntity");
        expect(idColumn?.mode).toBe("regular");
        expect(idColumn?.options).toMatchObject({ primary: true, type: "uuid" });
        expect(storage.generations).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    target: baseEntity,
                    propertyName: "id",
                    strategy: "uuid",
                }),
            ]),
        );
    });

    it("exposes the required turn columns and lifecycle metadata", () => {
        const module = requireCreatedModule<{
            AgentOpencodeTurn: Constructor;
        }>(TURN_ENTITY_PATH);
        if (!module) return;

        const columns = getMetadataArgsStorage()
            .filterColumns(module.AgentOpencodeTurn)
            .reduce<Record<string, Record<string, unknown>>>((result, column) => {
                result[column.propertyName] = column.options as Record<string, unknown>;
                return result;
            }, {});

        expect(columns).toMatchObject({
            conversationId: { type: "uuid", nullable: false },
            requestHash: { type: "text", nullable: false },
            dispatchSnapshot: { type: "jsonb", nullable: true },
            artifactBaseline: { type: "jsonb", nullable: true },
            runtimeConfigHash: { type: "text", nullable: false },
            inputMessageId: { type: "uuid", nullable: false },
            assistantMessageId: { type: "uuid", nullable: true },
            opencodeUserMessageId: { type: "text", nullable: false },
            status: { type: "text", nullable: false, default: "accepted" },
            lastActivityAt: { type: "timestamptz", nullable: false },
            errorCode: { type: "text", nullable: true },
            errorMessage: { type: "text", nullable: true },
            leaseToken: { type: "uuid", nullable: true },
            leaseExpiresAt: { type: "timestamptz", nullable: true },
            cancelRequestedAt: { type: "timestamptz", nullable: true },
            startedAt: { type: "timestamptz", nullable: true },
            completedAt: { type: "timestamptz", nullable: true },
        });
    });

    it("declares safe conversation and message foreign-key ownership", () => {
        const module = requireCreatedModule<{
            AgentOpencodeTurn: Constructor;
        }>(TURN_ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const relations = storage.filterRelations(module.AgentOpencodeTurn);
        const relation = (propertyName: string) =>
            relations.find((entry) => entry.propertyName === propertyName);
        const joinColumns = storage.joinColumns.filter(
            (entry) => entry.target === module.AgentOpencodeTurn,
        );

        expect(relation("conversation")?.options).toMatchObject({ onDelete: "CASCADE" });
        expect(relation("inputMessage")?.options).toMatchObject({ onDelete: "RESTRICT" });
        expect(relation("assistantMessage")?.options).toMatchObject({
            nullable: true,
            onDelete: "RESTRICT",
        });
        expect(joinColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ propertyName: "conversation", name: "conversation_id" }),
                expect.objectContaining({ propertyName: "inputMessage", name: "input_message_id" }),
                expect.objectContaining({
                    propertyName: "assistantMessage",
                    name: "assistant_message_id",
                }),
            ]),
        );
    });

    it("declares active-turn, message-link, terminal, and runtime-session invariants", () => {
        const module = requireCreatedModule<{
            AgentOpencodeTurn: Constructor;
        }>(TURN_ENTITY_PATH);
        if (!module) return;

        const storage = getMetadataArgsStorage();
        const turnIndices = storage.filterIndices(module.AgentOpencodeTurn);
        const turnChecks = storage.filterChecks(module.AgentOpencodeTurn);
        const conversationColumns = storage.filterColumns(AgentChatRecord);
        const conversationIndices = storage.filterIndices(AgentChatRecord);
        const conversationChecks = storage.filterChecks(AgentChatRecord);

        expect(turnIndices).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "uq_oc_turn_one_active_conversation",
                    columns: ["conversationId"],
                    unique: true,
                    where: expect.stringMatching(/accepted.*running.*committing/),
                }),
                expect.objectContaining({
                    name: "uq_oc_turn_input_message",
                    columns: ["inputMessageId"],
                    unique: true,
                }),
                expect.objectContaining({
                    name: "uq_oc_turn_assistant_message",
                    columns: ["assistantMessageId"],
                    unique: true,
                    where: expect.any(String),
                }),
                expect.objectContaining({
                    name: "uq_oc_turn_remote_user_message",
                    columns: ["conversationId", "opencodeUserMessageId"],
                    unique: true,
                }),
            ]),
        );
        expect(turnChecks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "ck_oc_turn_status",
                    expression: expect.stringMatching(/accepted.*completed.*cancelled.*failed/),
                }),
                expect.objectContaining({
                    name: "ck_oc_turn_lifecycle",
                    expression: expect.stringMatching(
                        /"status" IN \('completed', 'cancelled', 'failed'\)[\s\S]*"completed_at" IS NOT NULL[\s\S]*"assistant_message_id" IS NOT NULL[\s\S]*"dispatch_snapshot" IS NULL[\s\S]*"artifact_baseline" IS NULL[\s\S]*"lease_token" IS NULL[\s\S]*"lease_expires_at" IS NULL/,
                    ),
                }),
                expect.objectContaining({
                    name: "ck_oc_turn_lease_pair",
                    expression: expect.stringMatching(
                        /"lease_token" IS NULL AND "lease_expires_at" IS NULL[\s\S]*"lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL/,
                    ),
                }),
            ]),
        );

        expect(conversationColumns).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    propertyName: "opencodeSessionId",
                    options: expect.objectContaining({ type: "text", nullable: true }),
                }),
                expect.objectContaining({
                    propertyName: "opencodeRuntimeHash",
                    options: expect.objectContaining({ type: "text", nullable: true }),
                }),
            ]),
        );
        expect(conversationIndices).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "uq_agent_chat_oc_runtime_session",
                    columns: ["opencodeRuntimeHash", "opencodeSessionId"],
                    unique: true,
                    where: expect.any(String),
                }),
            ]),
        );
        expect(conversationChecks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "ck_agent_chat_oc_session_binding",
                    expression: expect.stringMatching(/opencode_session_id.*opencode_runtime_hash/),
                }),
            ]),
        );
    });
});

describe("OpenCode durable turn migration", () => {
    async function captureMigrationSql(direction: "up" | "down"): Promise<string[]> {
        const module = requireCreatedModule<{
            Migration1787270400000: new () => {
                up(queryRunner: QueryRunner): Promise<void>;
                down(queryRunner: QueryRunner): Promise<void>;
            };
        }>(MIGRATION_PATH);
        if (!module) return [];

        const sql: string[] = [];
        const queryRunner = {
            query: jest.fn(async (statement: string) => {
                sql.push(normalizeSql(statement));
            }),
        } as unknown as QueryRunner;
        await new module.Migration1787270400000()[direction](queryRunner);
        return sql;
    }

    it("creates the table, idempotent constraints, and indexes in dependency order", async () => {
        const sql = await captureMigrationSql("up");
        const joined = sql.join("\n");

        expect(joined).toMatch(/CREATE TABLE IF NOT EXISTS "ai_agent_opencode_turn"/);
        expect(joined).toMatch(/CONSTRAINT "pk_oc_turn" PRIMARY KEY \("id"\)/);
        expect(joined).toMatch(
            /ALTER TABLE "ai_agent_chat_record" ADD COLUMN IF NOT EXISTS "opencode_session_id" TEXT/,
        );
        expect(joined).toMatch(
            /ALTER TABLE "ai_agent_chat_record" ADD COLUMN IF NOT EXISTS "opencode_runtime_hash" TEXT/,
        );
        expect(joined).toMatch(/pg_constraint WHERE conname = 'ck_oc_turn_status'/);
        expect(joined).toMatch(/pg_constraint WHERE conname = 'ck_oc_turn_lifecycle'/);
        expect(joined).toMatch(/pg_constraint WHERE conname = 'ck_oc_turn_lease_pair'/);
        expect(joined).toMatch(
            /"status" IN \('completed', 'cancelled', 'failed'\)[\s\S]*"completed_at" IS NOT NULL[\s\S]*"assistant_message_id" IS NOT NULL[\s\S]*"dispatch_snapshot" IS NULL[\s\S]*"artifact_baseline" IS NULL[\s\S]*"lease_token" IS NULL[\s\S]*"lease_expires_at" IS NULL/,
        );
        expect(joined).toMatch(
            /"lease_token" IS NULL AND "lease_expires_at" IS NULL[\s\S]*"lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL/,
        );
        expect(joined).toMatch(/pg_constraint WHERE conname = 'ck_agent_chat_oc_session_binding'/);
        expect(joined).toMatch(/FOREIGN KEY \("conversation_id"\).*ON DELETE CASCADE/);
        expect(joined).toMatch(/FOREIGN KEY \("input_message_id"\).*ON DELETE RESTRICT/);
        expect(joined).toMatch(/FOREIGN KEY \("assistant_message_id"\).*ON DELETE RESTRICT/);

        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_one_active_conversation"[\s\S]*WHERE "status" IN \('accepted', 'running', 'committing'\)/,
        );
        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_input_message".*"input_message_id"/,
        );
        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_assistant_message".*WHERE "assistant_message_id" IS NOT NULL/,
        );
        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_oc_turn_remote_user_message".*"conversation_id", "opencode_user_message_id"/,
        );
        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_agent_chat_oc_runtime_session".*"opencode_runtime_hash", "opencode_session_id".*WHERE "opencode_session_id" IS NOT NULL/,
        );
        expect(joined).toMatch(
            /CREATE INDEX IF NOT EXISTS "idx_oc_turn_active_lease".*"lease_expires_at".*WHERE "status" IN \('accepted', 'running', 'committing'\)/,
        );
        expect(joined).toMatch(
            /CREATE INDEX IF NOT EXISTS "idx_oc_turn_conversation_created".*"conversation_id", "created_at"/,
        );
        expect(joined).toMatch(
            /CREATE UNIQUE INDEX IF NOT EXISTS "uq_account_log_oc_turn_billing".*"association_no".*WHERE "association_no" LIKE 'opencode-turn:%' AND "action" = 0/,
        );

        const tablePosition = sql.findIndex((statement) => statement.includes("CREATE TABLE"));
        const foreignKeyPosition = sql.findIndex((statement) =>
            statement.includes("fk_oc_turn_conversation"),
        );
        const indexPosition = sql.findIndex((statement) =>
            statement.includes("uq_oc_turn_one_active_conversation"),
        );
        expect(tablePosition).toBeGreaterThanOrEqual(0);
        expect(foreignKeyPosition).toBeGreaterThan(tablePosition);
        expect(indexPosition).toBeGreaterThan(foreignKeyPosition);
    });

    it("uses stable PostgreSQL identifiers and idempotent up statements", async () => {
        const sql = await captureMigrationSql("up");
        const joined = sql.join("\n");
        const names = Array.from(
            joined.matchAll(/(?:CONSTRAINT|INDEX(?: IF NOT EXISTS)?) "([^"]+)"/g),
            (match) => match[1],
        );

        expect(names.length).toBeGreaterThan(0);
        expect(names.every((name) => name.length <= 63)).toBe(true);
        expect(joined).not.toMatch(/CREATE (?:UNIQUE )?INDEX "(?!IF NOT EXISTS)/);
        for (const statement of sql.filter((entry) => entry.includes("ADD CONSTRAINT"))) {
            expect(statement).toMatch(/DO \$\$ BEGIN IF NOT EXISTS/);
        }
    });

    it("rolls back indexes and constraints before columns and table", async () => {
        const sql = await captureMigrationSql("down");
        const joined = sql.join("\n");

        expect(joined).toMatch(/DROP INDEX IF EXISTS "uq_account_log_oc_turn_billing"/);
        expect(joined).toMatch(/DROP INDEX IF EXISTS "uq_agent_chat_oc_runtime_session"/);
        expect(joined).toMatch(
            /ALTER TABLE "ai_agent_chat_record" DROP CONSTRAINT IF EXISTS "ck_agent_chat_oc_session_binding"/,
        );
        expect(joined).toMatch(
            /ALTER TABLE "ai_agent_chat_record" DROP COLUMN IF EXISTS "opencode_session_id"/,
        );
        expect(joined).toMatch(/DROP TABLE IF EXISTS "ai_agent_opencode_turn"/);

        const constraintPosition = sql.findIndex((statement) =>
            statement.includes("DROP CONSTRAINT"),
        );
        const columnPosition = sql.findIndex((statement) => statement.includes("DROP COLUMN"));
        const tablePosition = sql.findIndex((statement) => statement.includes("DROP TABLE"));
        expect(columnPosition).toBeGreaterThan(constraintPosition);
        expect(tablePosition).toBeGreaterThan(columnPosition);
    });
});
