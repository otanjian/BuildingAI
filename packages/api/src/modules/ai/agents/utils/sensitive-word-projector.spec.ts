import { createSensitiveWordFilter } from "./sensitive-word-filter";
import {
    projectAssistantParts,
    projectQuickCommands,
    projectRichText,
} from "./sensitive-word-projector";

const filter = createSensitiveWordFilter({
    enabled: true,
    revision: 1,
    rules: [
        { word: "secret", replacement: "public" },
        { word: "remove", replacement: "" },
    ],
    words: ["secret", "remove"],
    replacement: "***",
});

describe("sensitive word batch projectors", () => {
    it("projects only allowlisted assistant parts", () => {
        const parts = [
            { type: "text", text: "secret" },
            { type: "reasoning", text: "secret" },
            { type: "data-follow-up-suggestions", data: ["secret", "remove"] },
            { type: "data-custom-reply", data: { text: "secret", raw: "secret" } },
            { type: "tool-result", output: { text: "secret" } },
            { type: "data-unknown", data: { text: "secret" } },
            { type: "file", filename: "secret.txt" },
        ];

        expect(projectAssistantParts(parts, filter, true)).toEqual([
            { type: "text", text: "public" },
            { type: "reasoning", text: "public" },
            { type: "data-follow-up-suggestions", data: ["public", ""] },
            { type: "data-custom-reply", data: { text: "public", raw: "secret" } },
            { type: "tool-result", output: { text: "secret" } },
            { type: "data-unknown", data: { text: "secret" } },
            { type: "file", filename: "secret.txt" },
        ]);
    });

    it("leaves reasoning unchanged when disabled", () => {
        expect(
            projectAssistantParts([{ type: "reasoning", text: "secret" }], filter, false),
        ).toEqual([{ type: "reasoning", text: "secret" }]);
    });

    it("projects plain markdown and only text leaves in valid Plate JSON", () => {
        expect(projectRichText("**secret** remove", filter)).toBe("**public** ");
        const source = JSON.stringify([
            {
                type: "p",
                secretAttribute: "secret",
                children: [
                    { text: "secret" },
                    { type: "link", url: "https://secret.test", children: [{ text: "remove" }] },
                ],
            },
        ]);
        expect(JSON.parse(projectRichText(source, filter))).toEqual([
            {
                type: "p",
                secretAttribute: "secret",
                children: [
                    { text: "public" },
                    { type: "link", url: "https://secret.test", children: [{ text: "" }] },
                ],
            },
        ]);
    });

    it("projects copied custom replies without changing command input", () => {
        expect(
            projectQuickCommands(
                [
                    {
                        avatar: "",
                        name: "secret command",
                        content: "/secret",
                        replyType: "custom",
                        replyContent: "secret remove",
                    },
                ],
                filter,
            ),
        ).toEqual([
            {
                avatar: "",
                name: "secret command",
                content: "/secret",
                replyType: "custom",
                replyContent: "public ",
            },
        ]);
    });

    it("does not reprocess replacement output during a persistence projection", () => {
        const nonCascading = createSensitiveWordFilter({
            enabled: true,
            revision: 1,
            rules: [
                { word: "alpha", replacement: "beta" },
                { word: "beta", replacement: "masked" },
            ],
            words: ["alpha", "beta"],
            replacement: "***",
        });

        expect(
            projectAssistantParts(
                [{ type: "text", text: "alpha beta" }],
                nonCascading,
                true,
            ),
        ).toEqual([{ type: "text", text: "beta masked" }]);
    });
});
