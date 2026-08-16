import {
    findHealableCompletedAssistant,
    isOpencodeSessionStuck,
    isPlaceholderAssistantText,
    type OpencodeSessionMessageLike,
} from "./opencode-session-stuck";

function msg(
    role: string,
    opts: {
        id?: string;
        finish?: string | null;
        error?: unknown;
        text?: string;
    } = {},
): OpencodeSessionMessageLike {
    return {
        info: {
            id: opts.id ?? "msg_1",
            role,
            finish: opts.finish === undefined ? "stop" : opts.finish,
            error: opts.error,
        },
        parts: opts.text
            ? [{ type: "text", text: opts.text }]
            : [{ type: "tool", tool: "bash" }],
    };
}

describe("isOpencodeSessionStuck", () => {
    it("detects last unfinished assistant", () => {
        expect(
            isOpencodeSessionStuck([
                msg("user", { id: "u1", text: "hi" }),
                msg("assistant", { id: "a1", finish: null }),
            ]),
        ).toBe(true);
    });

    it("is not stuck when last assistant finished", () => {
        expect(
            isOpencodeSessionStuck([
                msg("user", { id: "u1", text: "hi" }),
                msg("assistant", { id: "a1", finish: "stop", text: "done" }),
            ]),
        ).toBe(false);
    });

    it("is stuck when last assistant has MessageAbortedError mid-tool", () => {
        expect(
            isOpencodeSessionStuck([
                msg("assistant", {
                    id: "a1",
                    finish: null,
                    error: { name: "MessageAbortedError" },
                }),
            ]),
        ).toBe(true);
    });

    it("handles empty list", () => {
        expect(isOpencodeSessionStuck([])).toBe(false);
        expect(isOpencodeSessionStuck(undefined)).toBe(false);
    });
});

describe("isPlaceholderAssistantText", () => {
    it("detects aborted and timeout placeholders", () => {
        expect(isPlaceholderAssistantText("** error: Aborted")).toBe(true);
        expect(isPlaceholderAssistantText("** error: ** turn timed out")).toBe(true);
        expect(isPlaceholderAssistantText("OpenCode error: OpenCode turn timed out")).toBe(true);
        expect(isPlaceholderAssistantText("Here is the analysis")).toBe(false);
    });
});

describe("findHealableCompletedAssistant", () => {
    it("returns last completed assistant with text after last user", () => {
        const messages = [
            msg("user", { id: "u1", text: "hi" }),
            msg("assistant", { id: "a1", finish: "stop", text: "partial" }),
            msg("user", { id: "u2", text: "again" }),
            msg("assistant", { id: "a2", finish: "stop", text: "final answer" }),
        ];
        const found = findHealableCompletedAssistant(messages);
        expect(found?.info.id).toBe("a2");
        expect(found?.text).toBe("final answer");
    });

    it("skips unfinished last assistant", () => {
        expect(
            findHealableCompletedAssistant([
                msg("user", { id: "u1", text: "hi" }),
                msg("assistant", { id: "a1", finish: null, text: "..." }),
            ]),
        ).toBeUndefined();
    });

    it("skips already healed message ids", () => {
        const messages = [
            msg("user", { id: "u1", text: "hi" }),
            msg("assistant", { id: "a2", finish: "stop", text: "final" }),
        ];
        expect(findHealableCompletedAssistant(messages, "a2")).toBeUndefined();
    });
});
