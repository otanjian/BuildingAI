import { sanitizeOpencodeMessageForPersistence } from "./opencode-message-sanitizer";

describe("sanitizeOpencodeMessageForPersistence", () => {
    it("removes database-invalid control characters recursively while preserving structure", () => {
        const source = {
            role: "assistant",
            parts: [
                { type: "text", text: "before\u0000after\u0001\u0008\u000b\u000c\u000e" },
                {
                    type: "tool-result",
                    output: { text: "line\nnext\tvalue\r\u0000", bytes: [1, null, true] },
                },
            ],
            metadata: { nested: { value: "\u0002ok" } },
        };

        expect(sanitizeOpencodeMessageForPersistence(source)).toEqual({
            role: "assistant",
            parts: [
                { type: "text", text: "beforeafter" },
                {
                    type: "tool-result",
                    output: { text: "line\nnext\tvalue\r", bytes: [1, null, true] },
                },
            ],
            metadata: { nested: { value: "ok" } },
        });
    });

    it("does not mutate the source and preserves valid unicode and whitespace", () => {
        const source = { text: "中文\n\t\r🙂", value: 42 };
        const result = sanitizeOpencodeMessageForPersistence(source);

        expect(result).toEqual(source);
        expect(result).not.toBe(source);
    });
});
