import { OpencodeAssistantPartRouter } from "./opencode-part-router";

function typesOf(chunks: Array<{ type: string }>): string[] {
    return chunks.map((c) => c.type);
}

describe("OpencodeAssistantPartRouter", () => {
    it("routes reasoning and text deltas to separate stream chunk types", () => {
        const router = new OpencodeAssistantPartRouter();
        router.registerPartType("r1", "reasoning");
        router.registerPartType("t1", "text");

        const reasoning = router.onDelta({
            messageRole: "assistant",
            partID: "r1",
            field: "text",
            delta: "think ",
        });
        const moreReasoning = router.onDelta({
            messageRole: "assistant",
            partID: "r1",
            field: "text",
            delta: "plan",
        });
        const text = router.onDelta({
            messageRole: "assistant",
            partID: "t1",
            field: "text",
            delta: "answer",
        });

        expect(typesOf(reasoning)).toEqual(["reasoning-start", "reasoning-delta"]);
        expect(typesOf(moreReasoning)).toEqual(["reasoning-delta"]);
        expect(typesOf(text)).toEqual(["text-start", "text-delta"]);
        expect(router.fullText).toBe("answer");
        expect(router.getPersistedReasoningParts()).toEqual([
            { type: "reasoning", text: "think plan", state: "done" },
        ]);
    });

    it("buffers deltas until part type is known", () => {
        const router = new OpencodeAssistantPartRouter();
        expect(
            router.onDelta({
                messageRole: "assistant",
                partID: "r1",
                field: "text",
                delta: "early",
            }),
        ).toEqual([]);

        const flushed = router.registerPartType("r1", "reasoning");
        expect(typesOf(flushed)).toEqual(["reasoning-start", "reasoning-delta"]);
        expect(flushed[1]).toMatchObject({ delta: "early" });
        expect(router.fullText).toBe("");
    });

    it("handles interleaved reasoning then text via part.updated snapshots", () => {
        const router = new OpencodeAssistantPartRouter();

        const r1 = router.onTextOrReasoningUpdated({
            messageRole: "assistant",
            part: { id: "r1", type: "reasoning", text: "step1" },
        });
        const r2 = router.onTextOrReasoningUpdated({
            messageRole: "assistant",
            part: { id: "r1", type: "reasoning", text: "step1step2", time: { end: 1 } },
        });
        const t1 = router.onTextOrReasoningUpdated({
            messageRole: "assistant",
            part: { id: "t1", type: "text", text: "final" },
        });

        expect(typesOf(r1)).toEqual(["reasoning-start", "reasoning-delta"]);
        expect(typesOf(r2)).toEqual(["reasoning-delta", "reasoning-end"]);
        expect(typesOf(t1)).toEqual(["text-start", "text-delta"]);
        expect(router.fullText).toBe("final");
    });

    it("ignores non-assistant deltas and ends open reasoning on finalize", () => {
        const router = new OpencodeAssistantPartRouter();
        router.registerPartType("r1", "reasoning");
        router.onDelta({
            messageRole: "assistant",
            partID: "r1",
            field: "text",
            delta: "open",
        });

        expect(
            router.onDelta({
                messageRole: "user",
                partID: "r1",
                field: "text",
                delta: "echo",
            }),
        ).toEqual([]);

        expect(typesOf(router.endOpenReasoning())).toEqual(["reasoning-end"]);
        expect(typesOf(router.endOpenReasoning())).toEqual([]);
    });

    it("reasoning-only turn does not pollute fullText", () => {
        const router = new OpencodeAssistantPartRouter();
        router.registerPartType("r1", "reasoning");
        router.onDelta({
            messageRole: "assistant",
            partID: "r1",
            field: "text",
            delta: "only thinking",
        });
        router.endOpenReasoning();

        expect(router.fullText).toBe("");
        expect(router.getPersistedReasoningParts()[0]?.text).toBe("only thinking");
    });
});
