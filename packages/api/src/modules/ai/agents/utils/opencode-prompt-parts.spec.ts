import {
    mapUiPartsToOpencodePromptParts,
    OpencodeAttachmentForwardError,
} from "./opencode-prompt-parts";

describe("mapUiPartsToOpencodePromptParts", () => {
    const appDomain = "https://ai.bosofts.com";

    it("maps image plus caption to text and file parts", () => {
        const result = mapUiPartsToOpencodePromptParts(
            [
                {
                    type: "file",
                    url: "https://ai.bosofts.com/uploads/image/2026/07/a.png",
                    mediaType: "image/png",
                    filename: "image.png",
                },
                { type: "text", text: "请按图片参数链接我的sap系统" },
            ],
            { appDomain },
        );

        expect(result.text).toBe("请按图片参数链接我的sap系统");
        expect(result.parts).toEqual([
            { type: "text", text: "请按图片参数链接我的sap系统" },
            {
                type: "file",
                mime: "image/png",
                url: "https://ai.bosofts.com/uploads/image/2026/07/a.png",
                filename: "image.png",
            },
        ]);
    });

    it("allows image-only prompts", () => {
        const result = mapUiPartsToOpencodePromptParts(
            [
                {
                    type: "file",
                    url: "https://ai.bosofts.com/uploads/image/a.png",
                    mediaType: "image/jpeg",
                },
            ],
            { appDomain },
        );

        expect(result.text).toBe("");
        expect(result.parts).toEqual([
            {
                type: "file",
                mime: "image/jpeg",
                url: "https://ai.bosofts.com/uploads/image/a.png",
            },
        ]);
    });

    it("keeps text-only behavior", () => {
        const result = mapUiPartsToOpencodePromptParts([{ type: "text", text: "hello" }], {
            appDomain,
        });

        expect(result.parts).toEqual([{ type: "text", text: "hello" }]);
        expect(result.text).toBe("hello");
    });

    it("rewrites localhost upload URLs onto APP_DOMAIN", () => {
        const result = mapUiPartsToOpencodePromptParts(
            [
                {
                    type: "file",
                    url: "http://127.0.0.1:4090/uploads/image/a.png",
                    mediaType: "image/png",
                    filename: "a.png",
                },
                { type: "text", text: "ocr this" },
            ],
            { appDomain },
        );

        expect(result.parts).toContainEqual({
            type: "file",
            mime: "image/png",
            url: "https://ai.bosofts.com/uploads/image/a.png",
            filename: "a.png",
        });
    });

    it("rejects blob: image URLs explicitly", () => {
        expect(() =>
            mapUiPartsToOpencodePromptParts(
                [
                    {
                        type: "file",
                        url: "blob:https://ai.bosofts.com/abc",
                        mediaType: "image/png",
                    },
                    { type: "text", text: "see image" },
                ],
                { appDomain },
            ),
        ).toThrow(OpencodeAttachmentForwardError);
    });

    it("ignores non-image file parts", () => {
        const result = mapUiPartsToOpencodePromptParts(
            [
                {
                    type: "file",
                    url: "https://ai.bosofts.com/uploads/file/a.pdf",
                    mediaType: "application/pdf",
                    filename: "a.pdf",
                },
                { type: "text", text: "summarize" },
            ],
            { appDomain },
        );

        expect(result.parts).toEqual([{ type: "text", text: "summarize" }]);
    });

    it("rejects empty prompt with no forwardable images", () => {
        expect(() => mapUiPartsToOpencodePromptParts([], { appDomain })).toThrow(
            /OpenCode prompt cannot be empty/i,
        );
    });
});
