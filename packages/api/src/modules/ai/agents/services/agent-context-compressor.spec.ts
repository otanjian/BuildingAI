import type { UIMessage } from "ai";

import {
    applySlidingWindow,
    compressAgentContext,
    estimateTokens,
    needsCompression,
    splitForCompression,
} from "./agent-context-compressor";

function msg(role: "user" | "assistant", text: string, id?: string): UIMessage {
    return {
        id: id ?? `${role}-${text.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`,
        role,
        parts: [{ type: "text", text }],
    } as UIMessage;
}

describe("agent-context-compressor", () => {
    it("does not compress when under maxContextMessages", async () => {
        const messages = [msg("user", "a"), msg("assistant", "b")];
        const result = await compressAgentContext(messages, {
            maxContextMessages: 10,
            truncationStrategy: "summary",
        });
        expect(result.compressed).toBe(false);
        expect(result.strategy).toBe("none");
        expect(result.messages).toHaveLength(2);
    });

    it("applies sliding window when strategy is sliding_window", async () => {
        const messages = Array.from({ length: 12 }, (_, i) =>
            msg(i % 2 === 0 ? "user" : "assistant", `m${i}`, `id-${i}`),
        );
        const result = await compressAgentContext(messages, {
            maxContextMessages: 6,
            truncationStrategy: "sliding_window",
        });
        expect(result.compressed).toBe(true);
        expect(result.strategy).toBe("sliding_window");
        expect(result.messages.length).toBeLessThanOrEqual(6);
        expect(result.messages.at(-1)?.id).toBe("id-11");
    });

    it("summarizes older turns when strategy is summary", async () => {
        const messages = Array.from({ length: 12 }, (_, i) =>
            msg(i % 2 === 0 ? "user" : "assistant", `turn-${i}`, `id-${i}`),
        );
        const summarize = jest.fn(async () => "- User asked about PO\n- Connected to SAP");
        const result = await compressAgentContext(
            messages,
            { maxContextMessages: 8, truncationStrategy: "summary" },
            summarize,
        );
        expect(summarize).toHaveBeenCalled();
        expect(result.compressed).toBe(true);
        expect(result.strategy).toBe("summary");
        expect(result.messages.length).toBeLessThan(messages.length);
        const firstText = (result.messages[0].parts?.[0] as { text?: string })?.text ?? "";
        expect(firstText).toContain("Prior conversation summary");
        expect(firstText).toContain("User asked about PO");
    });

    it("falls back to sliding window when summarize fails", async () => {
        const messages = Array.from({ length: 10 }, (_, i) =>
            msg(i % 2 === 0 ? "user" : "assistant", `x${i}`, `id-${i}`),
        );
        const result = await compressAgentContext(
            messages,
            { maxContextMessages: 6, truncationStrategy: "summary" },
            async () => {
                throw new Error("boom");
            },
        );
        expect(result.strategy).toBe("sliding_window");
        expect(result.reason).toContain("boom");
        expect(result.messages.length).toBeLessThanOrEqual(6);
    });

    it("needsCompression respects maxContextTokens estimate", () => {
        const long = "字".repeat(1000);
        const messages = [msg("user", long), msg("assistant", long)];
        const check = needsCompression(messages, {
            maxContextTokens: 100,
            truncationStrategy: "summary",
        });
        expect(estimateTokens(messages)).toBeGreaterThan(100);
        expect(check.needed).toBe(true);
    });

    it("splitForCompression keeps recent half", () => {
        const messages = Array.from({ length: 10 }, (_, i) =>
            msg("user", `u${i}`, `id-${i}`),
        );
        const { older, recent } = splitForCompression(messages, 8);
        expect(recent.length).toBeGreaterThanOrEqual(4);
        expect(older.length + recent.length).toBe(10);
        expect(applySlidingWindow(messages, 5)).toHaveLength(5);
    });
});
