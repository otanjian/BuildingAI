import { createSensitiveWordFilter } from "./sensitive-word-filter";
import {
    createSensitiveWordTransformStreamFromFilter,
    createSensitiveWordWriterFromFilter,
} from "./sensitive-word-stream";

function collectWriterOutput(config: { words: string[]; replacement?: string }): {
    writer: { write: (part: any) => void };
    parts: any[];
} {
    const parts: any[] = [];
    return {
        writer: { write: (part) => parts.push(part) },
        parts,
    };
}

describe("SensitiveWordWriter (provider path)", () => {
    it("filters text-delta chunks and flushes held-back text before text-end", () => {
        const { writer, parts } = collectWriterOutput({ words: ["敏感词"] });
        const filter = createSensitiveWordFilter({ enabled: true, words: ["敏感词"] });
        const wrapped = createSensitiveWordWriterFromFilter(writer, filter, true);

        wrapped.write({ type: "text-start", id: "txt-0" });
        wrapped.write({ type: "text-delta", id: "txt-0", delta: "这是敏" });
        wrapped.write({ type: "text-delta", id: "txt-0", delta: "感" });
        wrapped.write({ type: "text-delta", id: "txt-0", delta: "词内容" });
        wrapped.write({ type: "text-end", id: "txt-0" });
        wrapped.write({ type: "finish", finishReason: "stop" });

        const textDeltas = parts
            .filter((p) => p.type === "text-delta")
            .map((p) => p.delta)
            .join("");
        const types = parts.map((p) => p.type);

        expect(textDeltas).toBe("这是***内容");
        expect(types).toEqual([
            "text-start",
            "text-delta",
            "text-delta",
            "text-delta",
            "text-delta",
            "text-end",
            "finish",
        ]);
    });

    it("leaves reasoning-delta untouched when applyToReasoning is false", () => {
        const { writer, parts } = collectWriterOutput({ words: ["机密"] });
        const filter = createSensitiveWordFilter({ enabled: true, words: ["机密"] });
        const wrapped = createSensitiveWordWriterFromFilter(writer, filter, false);

        wrapped.write({ type: "reasoning-start", id: "r1" });
        wrapped.write({ type: "reasoning-delta", id: "r1", delta: "这里有机密信息" });
        wrapped.write({ type: "reasoning-end", id: "r1" });
        wrapped.write({ type: "text-start", id: "txt-0" });
        wrapped.write({ type: "text-delta", id: "txt-0", delta: "答案机密" });
        wrapped.write({ type: "text-end", id: "txt-0" });

        const reasoning = parts
            .filter((p) => p.type === "reasoning-delta")
            .map((p) => p.delta)
            .join("");
        const text = parts
            .filter((p) => p.type === "text-delta")
            .map((p) => p.delta)
            .join("");
        expect(reasoning).toBe("这里有机密信息");
        expect(text).toBe("答案***");
    });

    it("passes everything through when the filter is disabled", () => {
        const { writer, parts } = collectWriterOutput({ words: [] });
        const wrapped = createSensitiveWordWriterFromFilter(writer, createSensitiveWordFilter(null));

        wrapped.write({ type: "text-delta", id: "txt-0", delta: "敏感词" });
        wrapped.write({ type: "text-end", id: "txt-0" });
        expect(parts.map((p) => p.delta)).toEqual(["敏感词"]);
    });

    it("writer output equals batch filterText of the full corpus", () => {
        const words = ["敏感词", "机密", "apikey"];
        const fullText = "直播包含敏感词，也有机密内容和 APIKEY 字样。";
        const filter = createSensitiveWordFilter({ enabled: true, words });

        const { writer, parts } = collectWriterOutput({ words });
        const wrapped = createSensitiveWordWriterFromFilter(writer, filter, true);

        // Feed the full text in 2-char slices like a real token stream.
        for (let i = 0; i < fullText.length; i += 2) {
            wrapped.write({ type: "text-delta", id: "txt-0", delta: fullText.slice(i, i + 2) });
        }
        wrapped.write({ type: "text-end", id: "txt-0" });

        const streamed = parts
            .filter((p) => p.type === "text-delta")
            .map((p) => p.delta)
            .join("");
        expect(streamed).toBe(filter.filterText(fullText));
    });
});

describe("SensitiveWordTransformStream (direct path)", () => {
    it("filters chunks and flushes before text-end", async () => {
        const filter = createSensitiveWordFilter({ enabled: true, words: ["敏感词"] });
        const transform = createSensitiveWordTransformStreamFromFilter(filter, true);
        const writer = transform.writable.getWriter();
        const reader = transform.readable.getReader();

        const readAll = (async () => {
            const chunks: any[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            return chunks;
        })();

        await writer.write({ type: "text-start", id: "txt-0" });
        await writer.write({ type: "text-delta", id: "txt-0", delta: "前敏" });
        await writer.write({ type: "text-delta", id: "txt-0", delta: "感" });
        await writer.write({ type: "text-delta", id: "txt-0", delta: "词尾" });
        await writer.write({ type: "text-end", id: "txt-0" });
        await writer.close();

        const chunks = await readAll;
        const deltas = chunks.filter((c) => c.type === "text-delta").map((c) => c.delta);
        expect(deltas.join("")).toBe("前***尾");
        // text-end must come after the final flushed text-delta.
        const endIndex = chunks.findIndex((c) => c.type === "text-end");
        const lastDeltaIndex = chunks.reduce(
            (last, c, i) => (c.type === "text-delta" ? i : last),
            -1,
        );
        expect(lastDeltaIndex).toBeLessThan(endIndex);
    });

    it("passes chunks through unchanged when disabled", async () => {
        const transform = createSensitiveWordTransformStreamFromFilter(
            createSensitiveWordFilter(null),
        );
        const writer = transform.writable.getWriter();
        const reader = transform.readable.getReader();

        const readAll = (async () => {
            const chunks: any[] = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            return chunks;
        })();

        await writer.write({ type: "text-delta", id: "txt-0", delta: "敏感词" });
        await writer.close();

        expect(await readAll).toEqual([{ type: "text-delta", id: "txt-0", delta: "敏感词" }]);
    });
});
