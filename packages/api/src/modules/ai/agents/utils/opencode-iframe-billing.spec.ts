import {
    buildOpencodeIframeAssociationNo,
    initializeOpencodeIframeBillingState,
    planOpencodeIframeSettlements,
} from "./opencode-iframe-billing";

describe("OpenCode iframe billing", () => {
    const startedAt = new Date("2026-08-23T04:00:00.000Z");

    it("initializes one safe billing boundary and preserves it on later embed polls", () => {
        const initialized = initializeOpencodeIframeBillingState(undefined, startedAt);
        const repeated = initializeOpencodeIframeBillingState(
            initialized,
            new Date("2026-08-23T05:00:00.000Z"),
        );

        expect(initialized).toMatchObject({
            version: 1,
            startedAt: "2026-08-23T04:00:00.000Z",
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            consumedPower: 0,
            settledTurns: 0,
        });
        expect(repeated).toStrictEqual(initialized);
    });

    it("selects completed user turns after the boundary in chronological order", () => {
        const state = initializeOpencodeIframeBillingState(undefined, startedAt);
        const plans = planOpencodeIframeSettlements(
            [
                user("user-later", "2026-08-23T04:02:00.000Z"),
                assistant("assistant-later", "user-later", {
                    input: 100,
                    output: 20,
                    reasoning: 5,
                    cache: { read: 10, write: 0 },
                    total: 135,
                }),
                user("user-before", "2026-08-23T03:59:59.000Z"),
                assistant("assistant-before", "user-before", {
                    input: 999,
                    output: 999,
                    total: 1998,
                }),
                user("user-first", "2026-08-23T04:01:00.000Z"),
                assistant("assistant-first-a", "user-first", {
                    input: 40,
                    output: 8,
                    reasoning: 2,
                    cache: { read: 1, write: 0 },
                    total: 51,
                }),
                assistant("assistant-first-b", "user-first", {
                    input: 60,
                    output: 12,
                    reasoning: 3,
                    cache: { read: 2, write: 0 },
                    total: 77,
                }),
            ],
            state,
        );

        expect(plans.map((plan) => plan.userMessageId)).toEqual(["user-first", "user-later"]);
        expect(plans[0]?.usage).toMatchObject({
            inputTokens: 100,
            outputTokens: 25,
            totalTokens: 128,
        });
        expect(plans[1]?.usage.totalTokens).toBe(135);
    });

    it("filters through the durable cursor and stops at the first incomplete turn", () => {
        const state = {
            ...initializeOpencodeIframeBillingState(undefined, startedAt),
            lastSettledUserMessageId: "user-1",
            lastSettledUserMessageCreatedAt: Date.parse("2026-08-23T04:01:00.000Z"),
        };
        const plans = planOpencodeIframeSettlements(
            [
                user("user-1", "2026-08-23T04:01:00.000Z"),
                assistant("assistant-1", "user-1", { input: 10, output: 1, total: 11 }),
                user("user-2", "2026-08-23T04:02:00.000Z"),
                {
                    info: {
                        id: "assistant-2",
                        role: "assistant",
                        parentID: "user-2",
                        finish: null,
                        time: { created: Date.parse("2026-08-23T04:02:01.000Z") },
                        tokens: { input: 20, output: 2, total: 22 },
                    },
                    parts: [],
                },
                user("user-3", "2026-08-23T04:03:00.000Z"),
                assistant("assistant-3", "user-3", { input: 30, output: 3, total: 33 }),
            ],
            state,
        );

        expect(plans).toEqual([]);
    });

    it("builds a deterministic association covered by the OpenCode unique index", () => {
        const association = buildOpencodeIframeAssociationNo("conversation-1", "remote-user-1");

        expect(association).toMatch(/^opencode-turn:if:[a-f0-9]{40}$/);
        expect(association.length).toBeLessThanOrEqual(64);
        expect(buildOpencodeIframeAssociationNo("conversation-1", "remote-user-1")).toBe(
            association,
        );
        expect(buildOpencodeIframeAssociationNo("conversation-1", "remote-user-2")).not.toBe(
            association,
        );
    });
});

function user(id: string, createdAt: string) {
    return {
        info: {
            id,
            role: "user",
            time: { created: Date.parse(createdAt) },
        },
        parts: [],
    };
}

function assistant(id: string, parentID: string, tokens: Record<string, unknown>) {
    return {
        info: {
            id,
            role: "assistant",
            parentID,
            finish: "stop",
            time: { created: Date.parse("2026-08-23T04:10:00.000Z") },
            tokens,
        },
        parts: [],
    };
}
