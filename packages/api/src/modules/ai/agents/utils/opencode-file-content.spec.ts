import { normalizeOpencodeFileContentPayload } from "./opencode-file-content";

describe("normalizeOpencodeFileContentPayload", () => {
    it("preserves untrimmed text content", () => {
        expect(
            normalizeOpencodeFileContentPayload(
                { type: "text", content: "  hello\n" },
                "notes.txt",
            ),
        ).toEqual({
            path: "notes.txt",
            type: "text",
            content: "  hello\n",
            encoding: undefined,
            mimeType: undefined,
        });
    });

    it("preserves Base64 binary metadata", () => {
        expect(
            normalizeOpencodeFileContentPayload(
                {
                    type: "binary",
                    content: "AP8=",
                    encoding: "base64",
                    mimeType: "image/png",
                },
                "pixel.png",
            ),
        ).toEqual({
            path: "pixel.png",
            type: "binary",
            content: "AP8=",
            encoding: "base64",
            mimeType: "image/png",
        });
    });
});
