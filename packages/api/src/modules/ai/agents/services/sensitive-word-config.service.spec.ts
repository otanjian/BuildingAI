import type { SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";

jest.mock("@buildingai/db/entities/ai-agent.entity", () => ({ Agent: class Agent {} }));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        conflict: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));

import { SensitiveWordConfigService } from "./sensitive-word-config.service";

function createHarness(storedConfig: SensitiveWordConfig | null = null) {
    const agent = {
        id: "agent-1",
        createBy: "owner-1",
        sensitiveWordConfig: storedConfig,
    };
    const queryBuilder = {
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(agent),
    };
    const query = jest.fn().mockResolvedValue([{ affectedRows: 1 }]);
    const metadata = {
        tablePath: "public.ai_agents",
        findColumnWithPropertyName: jest.fn((propertyName: string) => {
            const columns: Record<string, { databaseName: string }> = {
                id: { databaseName: "id" },
                updatedAt: { databaseName: "updated_at" },
                sensitiveWordConfig: { databaseName: "sensitive_word_config" },
            };
            return columns[propertyName];
        }),
    };
    const manager = {
        getRepository: jest.fn(() => ({ createQueryBuilder: () => queryBuilder })),
        connection: {
            getMetadata: jest.fn(() => metadata),
            driver: {
                escape: (name: string) => `"${name}"`,
                createParameter: (_name: string, index: number) => `$${index + 1}`,
            },
        },
        query,
    };
    const dataSource = {
        transaction: jest.fn(async (callback: (value: typeof manager) => unknown) => callback(manager)),
    };
    const service = new SensitiveWordConfigService(dataSource as never);

    return { agent, dataSource, manager, metadata, query, queryBuilder, service };
}

describe("SensitiveWordConfigService", () => {
    it("preflights mapping conflicts before an ordinary agent update can write", () => {
        const harness = createHarness({
            enabled: true,
            revision: 2,
            rules: [{ word: "secret", replacement: "public" }],
            words: ["secret"],
            replacement: "***",
        });

        expect(() =>
            harness.service.assertCompatibilityUpdate(harness.agent.sensitiveWordConfig, {
                enabled: true,
                words: ["changed"],
                replacement: "***",
            }),
        ).toThrow("Sensitive word mapping requires the new editor");
        expect(harness.query).not.toHaveBeenCalled();
    });

    it("locks the agent row and initializes canonical revision one", async () => {
        const harness = createHarness({
            enabled: true,
            words: ["legacy"],
            replacement: "mask",
        });

        const result = await harness.service.updateCanonical("owner-1", "agent-1", {
            enabled: true,
            applyToReasoning: false,
            expectedRevision: 0,
            rules: [
                { word: " secret ", replacement: "public" },
                { word: "apikey", replacement: "" },
            ],
        });

        expect(harness.queryBuilder.setLock).toHaveBeenCalledWith("pessimistic_write");
        expect(harness.queryBuilder.where).toHaveBeenCalledWith("agent.id = :agentId", {
            agentId: "agent-1",
        });
        expect(result).toEqual({
            enabled: true,
            applyToReasoning: false,
            revision: 1,
            rules: [
                { word: "secret", replacement: "public" },
                { word: "apikey", replacement: "" },
            ],
            words: ["secret", "apikey"],
            replacement: "***",
        });
        expect(harness.query).toHaveBeenCalledTimes(1);
        expect(harness.query.mock.calls[0][0]).toContain(
            'UPDATE "public"."ai_agents" SET "sensitive_word_config" = $1, "updated_at" = $2 WHERE "id" = $3',
        );
        expect(JSON.parse(harness.query.mock.calls[0][1][0])).toEqual(result);
        expect(harness.query.mock.calls[0][1][2]).toBe("agent-1");
    });

    it("rejects a stale revision without writing", async () => {
        const harness = createHarness({
            enabled: true,
            revision: 4,
            rules: [{ word: "secret", replacement: "public" }],
            words: ["secret"],
            replacement: "***",
        });

        await expect(
            harness.service.updateCanonical("owner-1", "agent-1", {
                enabled: true,
                applyToReasoning: true,
                expectedRevision: 3,
                rules: [{ word: "secret", replacement: "changed" }],
            }),
        ).rejects.toThrow("Sensitive word config revision conflict");
        expect(harness.query).not.toHaveBeenCalled();
    });

    it("does not increment or write for a canonical semantic no-op", async () => {
        const stored: SensitiveWordConfig = {
            enabled: true,
            applyToReasoning: true,
            revision: 2,
            rules: [{ word: "secret", replacement: "public" }],
            words: ["secret"],
            replacement: "***",
        };
        const harness = createHarness(stored);

        await expect(
            harness.service.updateCanonical("owner-1", "agent-1", {
                enabled: true,
                applyToReasoning: true,
                expectedRevision: 2,
                rules: [{ word: " secret ", replacement: "public" }],
            }),
        ).resolves.toBe(stored);
        expect(harness.query).not.toHaveBeenCalled();
    });

    it("repairs a missing compatibility shadow even when canonical rules are unchanged", async () => {
        const harness = createHarness({
            enabled: true,
            applyToReasoning: true,
            revision: 2,
            rules: [{ word: "secret", replacement: "public" }],
            words: [],
            replacement: "unsafe",
        });

        const result = await harness.service.updateCanonical("owner-1", "agent-1", {
            enabled: true,
            applyToReasoning: true,
            expectedRevision: 2,
            rules: [{ word: "secret", replacement: "public" }],
        });

        expect(result).toMatchObject({
            revision: 3,
            words: ["secret"],
            replacement: "***",
        });
        expect(harness.query).toHaveBeenCalledTimes(1);
    });

    it("checks ownership before writing", async () => {
        const harness = createHarness();

        await expect(
            harness.service.updateCanonical("other-user", "agent-1", {
                enabled: true,
                applyToReasoning: true,
                expectedRevision: 0,
                rules: [],
            }),
        ).rejects.toThrow("Forbidden");
        expect(harness.query).not.toHaveBeenCalled();
    });

    it("applies old-client switch changes through the same locked writer", async () => {
        const harness = createHarness({
            enabled: true,
            applyToReasoning: false,
            revision: 7,
            rules: [{ word: "secret", replacement: "public" }],
            words: ["secret"],
            replacement: "***",
        });

        const result = await harness.service.applyCompatibilityUpdate(
            "owner-1",
            "agent-1",
            null,
        );

        expect(result).toMatchObject({
            enabled: false,
            applyToReasoning: false,
            revision: 8,
            rules: [{ word: "secret", replacement: "public" }],
        });
        expect(harness.query).toHaveBeenCalledTimes(1);
    });

    it("ignores stale canonical echoes without writing", async () => {
        const stored: SensitiveWordConfig = {
            enabled: true,
            applyToReasoning: true,
            revision: 7,
            rules: [{ word: "secret", replacement: "public" }],
            words: ["secret"],
            replacement: "***",
        };
        const harness = createHarness(stored);

        await expect(
            harness.service.applyCompatibilityUpdate("owner-1", "agent-1", {
                ...stored,
                revision: 6,
                enabled: false,
            }),
        ).resolves.toBe(stored);
        expect(harness.query).not.toHaveBeenCalled();
    });
});
