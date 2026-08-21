jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import {
    buildOpencodeTurnProjection,
    OpencodeTurnProjectionError,
} from "./opencode-turn-projection";

const USER_MESSAGE_ID = "msg_user";

function message(info: Record<string, unknown>, parts: Array<Record<string, unknown>>) {
    return { info, parts };
}

describe("buildOpencodeTurnProjection", () => {
    it("projects only exact assistant descendants with text, reasoning, tools, and usage", () => {
        const projection = buildOpencodeTurnProjection({
            remoteUserMessageId: USER_MESSAGE_ID,
            messages: [
                message(
                    { id: "msg_other", role: "assistant", parentID: "other", finish: "stop" },
                    [{ id: "part_other", type: "text", text: "unrelated" }],
                ),
                message(
                    {
                        id: "msg_a1",
                        role: "assistant",
                        parentID: USER_MESSAGE_ID,
                        finish: "tool-calls",
                        tokens: {
                            input: 10,
                            output: 2,
                            reasoning: 1,
                            cache: { read: 3, write: 0 },
                        },
                    },
                    [
                        { id: "reason_1", type: "reasoning", text: "think secret" },
                        {
                            id: "tool_1",
                            type: "tool",
                            callID: "call_1",
                            tool: "write",
                            state: {
                                status: "completed",
                                input: { filePath: "/workspace/artifacts/report.html" },
                                output: "ok",
                            },
                        },
                    ],
                ),
                message(
                    {
                        id: "msg_a2",
                        role: "assistant",
                        parentID: USER_MESSAGE_ID,
                        finish: "stop",
                        tokens: {
                            input: 4,
                            output: 5,
                            reasoning: 0,
                            cache: { read: 0, write: 0 },
                        },
                    },
                    [{ id: "text_1", type: "text", text: "answer secret" }],
                ),
            ],
            sensitiveWordConfig: {
                enabled: true,
                words: ["secret"],
                replacement: "***",
                applyToReasoning: true,
            },
        });

        expect(projection.remoteAssistantMessageIds).toEqual(["msg_a1", "msg_a2"]);
        expect(projection.parts).toEqual([
            { type: "reasoning", text: "think ***", state: "done" },
            expect.objectContaining({
                type: "dynamic-tool",
                toolCallId: "call_1",
                toolName: "write",
                state: "output-available",
            }),
            { type: "text", text: "answer ***" },
        ]);
        expect(projection.usage).toMatchObject({
            inputTokens: 14,
            outputTokens: 8,
            totalTokens: 25,
        });
        expect(JSON.stringify(projection)).not.toContain("unrelated");
    });

    it("reports an exact descendant error without using unrelated fallback text", () => {
        const projection = buildOpencodeTurnProjection({
            remoteUserMessageId: USER_MESSAGE_ID,
            messages: [
                message(
                    {
                        id: "msg_error",
                        role: "assistant",
                        parentID: USER_MESSAGE_ID,
                        error: { name: "ProviderError", message: "upstream unavailable" },
                    },
                    [],
                ),
                message(
                    { id: "msg_other", role: "assistant", parentID: "other", finish: "stop" },
                    [{ id: "text_other", type: "text", text: "wrong answer" }],
                ),
            ],
        });

        expect(projection.error).toMatchObject({ code: "OPENCODE_REMOTE_MESSAGE_ERROR" });
        expect(JSON.stringify(projection)).not.toContain("wrong answer");
    });

    it("rejects empty or unfinished exact descendants instead of creating a blank assistant", () => {
        expect(() =>
            buildOpencodeTurnProjection({
                remoteUserMessageId: USER_MESSAGE_ID,
                messages: [
                    message(
                        {
                            id: "msg_running",
                            role: "assistant",
                            parentID: USER_MESSAGE_ID,
                        },
                        [],
                    ),
                ],
            }),
        ).toThrow(OpencodeTurnProjectionError);
    });
});
