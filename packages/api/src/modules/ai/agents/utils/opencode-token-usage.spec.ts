import {
    normalizeOpencodeTokens,
    OpencodeTokenUsageAccumulator,
    toChatMessageUsage,
} from "./opencode-token-usage";

describe("normalizeOpencodeTokens", () => {
    it("maps OpenCode tokens and cost", () => {
        expect(
            normalizeOpencodeTokens(
                {
                    input: 100,
                    output: 40,
                    reasoning: 20,
                    cache: { read: 10, write: 5 },
                    total: 170,
                },
                0.012,
            ),
        ).toEqual({
            input: 100,
            output: 40,
            reasoning: 20,
            cacheRead: 10,
            cacheWrite: 5,
            total: 170,
            cost: 0.012,
        });
    });

    it("returns undefined for missing tokens", () => {
        expect(normalizeOpencodeTokens(undefined)).toBeUndefined();
        expect(normalizeOpencodeTokens(null)).toBeUndefined();
    });
});

describe("toChatMessageUsage", () => {
    it("maps text/reasoning/cache into ChatMessageUsage", () => {
        const usage = toChatMessageUsage({
            input: 100,
            output: 40,
            reasoning: 20,
            cacheRead: 10,
            cacheWrite: 5,
            total: 170,
            cost: 0.01,
        });

        expect(usage.inputTokens).toBe(100);
        expect(usage.outputTokens).toBe(60);
        expect(usage.totalTokens).toBe(170);
        expect(usage.outputTokenDetails).toEqual({ textTokens: 40, reasoningTokens: 20 });
        expect(usage.inputTokenDetails).toEqual({
            noCacheTokens: 100,
            cacheReadTokens: 10,
            cacheWriteTokens: 5,
        });
        expect(usage.reasoningTokens).toBe(20);
        expect(usage.cachedInputTokens).toBe(10);
    });

    it("computes total when OpenCode total is absent", () => {
        const usage = toChatMessageUsage({
            input: 100,
            output: 40,
            reasoning: 20,
            cacheRead: 10,
            cacheWrite: 5,
        });
        expect(usage.totalTokens).toBe(170);
    });
});

describe("OpencodeTokenUsageAccumulator", () => {
    it("keeps latest tokens per assistant message id", () => {
        const acc = new OpencodeTokenUsageAccumulator();
        acc.observeMessageUpdated({
            id: "m1",
            role: "assistant",
            tokens: { input: 10, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
        });
        acc.observeMessageUpdated({
            id: "m1",
            role: "assistant",
            tokens: {
                input: 100,
                output: 40,
                reasoning: 20,
                cache: { read: 0, write: 0 },
                total: 160,
            },
            cost: 0.02,
        });

        const usage = acc.finalize();
        expect(usage.inputTokens).toBe(100);
        expect(usage.outputTokens).toBe(60);
        expect(usage.totalTokens).toBe(160);
    });

    it("sums multiple assistant messages in one turn", () => {
        const acc = new OpencodeTokenUsageAccumulator();
        acc.observeMessageUpdated({
            id: "m1",
            role: "assistant",
            tokens: {
                input: 100,
                output: 10,
                reasoning: 5,
                cache: { read: 2, write: 0 },
                total: 117,
            },
        });
        acc.observeMessageUpdated({
            id: "m2",
            role: "assistant",
            tokens: {
                input: 50,
                output: 20,
                reasoning: 10,
                cache: { read: 1, write: 0 },
                total: 81,
            },
        });
        // user messages ignored
        acc.observeMessageUpdated({
            id: "u1",
            role: "user",
            tokens: { input: 999, output: 999, reasoning: 0, cache: { read: 0, write: 0 } },
        });

        const usage = acc.finalize();
        expect(usage.inputTokens).toBe(150);
        expect(usage.outputTokens).toBe(45);
        expect(usage.totalTokens).toBe(198);
        expect(usage.inputTokenDetails?.cacheReadTokens).toBe(3);
        expect(usage.outputTokenDetails?.reasoningTokens).toBe(15);
    });

    it("falls back to step-finish when message tokens are empty", () => {
        const acc = new OpencodeTokenUsageAccumulator();
        acc.observeMessageUpdated({
            id: "m1",
            role: "assistant",
            tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
        });
        acc.observeStepFinishPart({
            id: "sf1",
            type: "step-finish",
            tokens: {
                input: 80,
                output: 30,
                reasoning: 10,
                cache: { read: 4, write: 1 },
            },
            cost: 0.005,
        });

        const usage = acc.finalize();
        expect(usage.inputTokens).toBe(80);
        expect(usage.outputTokens).toBe(40);
        expect(usage.totalTokens).toBe(124);
        expect((usage.raw as any)?.opencode?.source).toBe("step-finish");
    });

    it("prefers message.updated over step-finish when messages have tokens", () => {
        const acc = new OpencodeTokenUsageAccumulator();
        acc.observeMessageUpdated({
            id: "m1",
            role: "assistant",
            tokens: {
                input: 10,
                output: 5,
                reasoning: 0,
                cache: { read: 0, write: 0 },
                total: 15,
            },
        });
        acc.observeStepFinishPart({
            id: "sf1",
            type: "step-finish",
            tokens: {
                input: 999,
                output: 999,
                reasoning: 0,
                cache: { read: 0, write: 0 },
            },
        });

        const usage = acc.finalize();
        expect(usage.inputTokens).toBe(10);
        expect(usage.outputTokens).toBe(5);
        expect(usage.totalTokens).toBe(15);
        expect((usage.raw as any)?.opencode?.source).toBe("message.updated");
    });

    it("returns zero usage when OpenCode omits tokens", () => {
        const acc = new OpencodeTokenUsageAccumulator();
        acc.observeMessageUpdated({ id: "m1", role: "assistant" });
        const usage = acc.finalize();
        expect(usage.inputTokens).toBe(0);
        expect(usage.outputTokens).toBe(0);
        expect(usage.totalTokens).toBe(0);
    });
});
