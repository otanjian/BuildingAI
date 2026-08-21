jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import {
    classifyLegacyOpencodeMappings,
    OpencodeLegacyBindingMigrationService,
    type LegacyOpencodeMappingCandidate,
} from "./opencode-legacy-binding-migration";

function candidate(
    conversationId: string,
    overrides: Partial<LegacyOpencodeMappingCandidate> = {},
): LegacyOpencodeMappingCandidate {
    return {
        conversationId,
        sessionId: `ses_${conversationId}`,
        runtimeHash: "runtime-a",
        sessionVerified: true,
        messages: [
            { id: `${conversationId}-user`, parentId: null },
            { id: `${conversationId}-assistant`, parentId: `${conversationId}-user` },
        ],
        ...overrides,
    };
}

describe("legacy OpenCode session/runtime mapping migration", () => {
    it("backfills only remotely verified, unique, linear mappings", () => {
        const report = classifyLegacyOpencodeMappings([
            candidate("verified"),
            candidate("branched", {
                messages: [
                    { id: "root", parentId: null },
                    { id: "reply-a", parentId: "root" },
                    { id: "reply-b", parentId: "root" },
                ],
            }),
            candidate("duplicate-a", { sessionId: "ses_duplicate" }),
            candidate("duplicate-b", { sessionId: "ses_duplicate" }),
            candidate("unverifiable", {
                sessionVerified: false,
                verificationError: "remote session not found",
            }),
        ]);

        expect(report).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ conversationId: "verified", eligible: true, issues: [] }),
                expect.objectContaining({
                    conversationId: "branched",
                    eligible: false,
                    issues: expect.arrayContaining(["branched"]),
                }),
                expect.objectContaining({
                    conversationId: "duplicate-a",
                    eligible: false,
                    issues: expect.arrayContaining(["duplicate"]),
                }),
                expect.objectContaining({
                    conversationId: "duplicate-b",
                    eligible: false,
                    issues: expect.arrayContaining(["duplicate"]),
                }),
                expect.objectContaining({
                    conversationId: "unverifiable",
                    eligible: false,
                    issues: expect.arrayContaining(["unverifiable"]),
                }),
            ]),
        );
    });

    it("treats missing roots, cycles, and empty histories as unverifiable instead of guessing", () => {
        const report = classifyLegacyOpencodeMappings([
            candidate("missing-root", {
                messages: [{ id: "reply", parentId: "unknown" }],
            }),
            candidate("cycle", {
                messages: [
                    { id: "a", parentId: "b" },
                    { id: "b", parentId: "a" },
                ],
            }),
            candidate("empty", { messages: [] }),
        ]);

        expect(report.every((item) => !item.eligible)).toBe(true);
        expect(report.map((item) => item.issues)).toEqual([
            ["unverifiable"],
            ["unverifiable"],
            ["unverifiable"],
        ]);
    });

    it("applies only eligible rows with metadata and uniqueness guards", async () => {
        const query = jest.fn(async (_sql: string, _parameters?: unknown[]) => [
            { id: "verified" },
        ]);
        const runner = {
            connect: jest.fn(),
            startTransaction: jest.fn(),
            query,
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
        };
        const service = new OpencodeLegacyBindingMigrationService(
            { createQueryRunner: () => runner } as any,
            {} as any,
            {} as any,
            {} as any,
        );
        const planned = classifyLegacyOpencodeMappings([
            candidate("verified"),
            candidate("branched", {
                messages: [
                    { id: "root", parentId: null },
                    { id: "a", parentId: "root" },
                    { id: "b", parentId: "root" },
                ],
            }),
        ]);

        await expect(service.applyVerified(planned)).resolves.toEqual({
            migratedConversationIds: ["verified"],
            skippedConversationIds: ["branched"],
        });
        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0][0]).toContain('"opencode_session_id" IS NULL');
        expect(query.mock.calls[0][0]).toContain('"metadata" ->> \'opencodeSessionId\'');
        expect(query.mock.calls[0][1]).toEqual(["verified", "ses_verified", "runtime-a"]);
        expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(runner.rollbackTransaction).not.toHaveBeenCalled();
        expect(runner.release).toHaveBeenCalledTimes(1);
    });
});
