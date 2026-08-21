import { createSensitiveWordFilter } from "./sensitive-word-filter";
import { createSensitiveWordTransformStreamFromFilter } from "./sensitive-word-stream";

async function project(
    chunks: Record<string, any>[],
    applyToReasoning = true,
): Promise<Record<string, any>[]> {
    const filter = createSensitiveWordFilter({
        enabled: true,
        revision: 1,
        rules: [
            { word: "secret", replacement: "SAFE" },
            { word: "apikey", replacement: "" },
        ],
        words: ["secret", "apikey"],
        replacement: "***",
    });
    const transform = createSensitiveWordTransformStreamFromFilter(filter, applyToReasoning);
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();
    const outputPromise = (async () => {
        const output: Record<string, any>[] = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) return output;
            output.push(value);
        }
    })();
    for (const chunk of chunks) await writer.write(chunk);
    await writer.close();
    return outputPromise;
}

function deltaText(chunks: Record<string, any>[], type: string, id: string): string {
    return chunks
        .filter((chunk) => chunk.type === type && chunk.id === id)
        .map((chunk) => chunk.delta)
        .join("");
}

describe("sensitive-word outbound projector", () => {
    it("isolates reasoning from answer text and flushes before each matching end", async () => {
        const output = await project([
            { type: "reasoning-start", id: "r1" },
            { type: "reasoning-delta", id: "r1", delta: "secr" },
            { type: "reasoning-end", id: "r1" },
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "et secret" },
            { type: "text-end", id: "t1" },
        ]);

        expect(deltaText(output, "reasoning-delta", "r1")).toBe("secr");
        expect(deltaText(output, "text-delta", "t1")).toBe("et SAFE");
        expect(output.map((chunk) => chunk.type)).toEqual([
            "reasoning-start",
            "reasoning-delta",
            "reasoning-end",
            "text-start",
            "text-delta",
            "text-end",
        ]);
    });

    it("isolates multiple parts of the same channel by ID", async () => {
        const output = await project([
            { type: "text-start", id: "a" },
            { type: "text-delta", id: "a", delta: "secr" },
            { type: "text-start", id: "b" },
            { type: "text-delta", id: "b", delta: "et" },
            { type: "text-end", id: "a" },
            { type: "text-end", id: "b" },
        ]);

        expect(deltaText(output, "text-delta", "a")).toBe("secr");
        expect(deltaText(output, "text-delta", "b")).toBe("et");
    });

    it("recovers a valid delta without start and preserves latest metadata", async () => {
        const output = await project([
            { type: "text-delta", id: "t1", delta: "secr", providerMetadata: { seq: 1 } },
            { type: "text-delta", id: "t1", delta: "et", providerMetadata: { seq: 2 } },
            { type: "text-end", id: "t1" },
        ]);

        expect(output[0]).toEqual({ type: "text-start", id: "t1" });
        const delta = output.find((chunk) => chunk.type === "text-delta");
        expect(delta).toMatchObject({ id: "t1", delta: "SAFE", providerMetadata: { seq: 2 } });
    });

    it("terminates safely when a delta has no usable ID", async () => {
        const output = await project([
            { type: "text-delta", delta: "raw secret" },
            { type: "text-start", id: "late" },
            { type: "text-delta", id: "late", delta: "must be discarded" },
        ]);

        expect(output).toEqual([
            { type: "error", errorText: "Assistant response stream is invalid." },
        ]);
    });

    it("closes an old logical part before a repeated start", async () => {
        const output = await project([
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "secr" },
            { type: "text-start", id: "t1" },
            { type: "text-delta", id: "t1", delta: "et" },
            { type: "text-end", id: "t1" },
        ]);

        expect(output.map((chunk) => chunk.type)).toEqual([
            "text-start",
            "text-delta",
            "text-end",
            "text-start",
            "text-delta",
            "text-end",
        ]);
        expect(deltaText(output, "text-delta", "t1")).toBe("secret");
    });

    it("suppresses unmatched and duplicate end events", async () => {
        const output = await project([
            { type: "text-end", id: "missing" },
            { type: "text-start", id: "t1" },
            { type: "text-end", id: "t1" },
            { type: "text-end", id: "t1" },
        ]);
        expect(output.map((chunk) => chunk.type)).toEqual(["text-start", "text-end"]);
    });

    for (const boundary of [
        { type: "start" },
        { type: "start-step" },
        { type: "finish-step" },
        { type: "finish", finishReason: "stop" },
        { type: "abort" },
        { type: "error", errorText: "secret error" },
    ]) {
        it(`flushes and synthetically closes before ${boundary.type}`, async () => {
            const output = await project([
                { type: "text-start", id: "t1" },
                { type: "text-delta", id: "t1", delta: "secr" },
                boundary,
            ]);
            const boundaryIndex = output.findIndex((chunk) => chunk.type === boundary.type);
            expect(output.slice(0, boundaryIndex).map((chunk) => chunk.type)).toEqual([
                "text-start",
                "text-delta",
                "text-end",
            ]);
            if (boundary.type === "error") {
                expect(output[boundaryIndex]).toEqual({ type: "error", errorText: "SAFE error" });
            }
        });
    }

    it("flushes and synthetically closes at EOF", async () => {
        const output = await project([
            { type: "reasoning-start", id: "r1" },
            { type: "reasoning-delta", id: "r1", delta: "secr" },
        ]);
        expect(output.map((chunk) => chunk.type)).toEqual([
            "reasoning-start",
            "reasoning-delta",
            "reasoning-end",
        ]);
    });

    it("discards chunks after terminal events", async () => {
        const output = await project([
            { type: "finish", finishReason: "stop" },
            { type: "text-start", id: "late" },
            { type: "text-delta", id: "late", delta: "secret" },
        ]);
        expect(output).toEqual([{ type: "finish", finishReason: "stop" }]);
    });

    it("terminates safely after more than 32 open parts", async () => {
        const chunks = Array.from({ length: 33 }, (_, index) => ({
            type: "text-start",
            id: `t-${index}`,
        }));
        chunks.push({ type: "text-delta", id: "late", delta: "secret" } as never);
        const output = await project(chunks);

        expect(output.filter((chunk) => chunk.type === "error")).toEqual([
            { type: "error", errorText: "Assistant response stream is invalid." },
        ]);
        expect(output.filter((chunk) => chunk.type === "text-end")).toHaveLength(32);
    });

    it("filters only allowlisted display data and top-level errors", async () => {
        const output = await project([
            { type: "data-follow-up-suggestions", data: ["secret", "safe"] },
            { type: "data-custom-reply", data: { text: "secret", internal: "secret" } },
            { type: "data-unknown", data: { text: "secret" } },
            { type: "tool-error", errorText: "secret" },
            { type: "error", errorText: "secret" },
        ]);

        expect(output).toEqual([
            { type: "data-follow-up-suggestions", data: ["SAFE", "safe"] },
            { type: "data-custom-reply", data: { text: "SAFE", internal: "secret" } },
            { type: "data-unknown", data: { text: "secret" } },
            { type: "tool-error", errorText: "secret" },
            { type: "error", errorText: "SAFE" },
        ]);
    });

    it("normalizes malformed top-level errors to a schema-valid generic error", async () => {
        const output = await project([{ type: "error", error: "raw secret" }]);
        expect(output).toEqual([
            { type: "error", errorText: "Assistant response stream is invalid." },
        ]);
    });

    it("bypasses reasoning replacement while preserving its lifecycle", async () => {
        const output = await project(
            [
                { type: "reasoning-start", id: "r1" },
                { type: "reasoning-delta", id: "r1", delta: "secret" },
                { type: "reasoning-end", id: "r1" },
                { type: "text-start", id: "t1" },
                { type: "text-delta", id: "t1", delta: "secret" },
                { type: "text-end", id: "t1" },
            ],
            false,
        );
        expect(deltaText(output, "reasoning-delta", "r1")).toBe("secret");
        expect(deltaText(output, "text-delta", "t1")).toBe("SAFE");
    });
});
