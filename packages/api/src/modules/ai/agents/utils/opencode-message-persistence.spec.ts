import { createSensitiveWordFilter } from "./sensitive-word-filter";
import {
    persistOpencodeAssistantMessageSafely,
    prepareOpencodeAssistantMessageForPersistence,
} from "./opencode-message-persistence";

describe("prepareOpencodeAssistantMessageForPersistence", () => {
    it("sanitizes nested invalid characters before persistence", () => {
        const message = prepareOpencodeAssistantMessageForPersistence(
            {
                id: "assistant-id",
                role: "assistant",
                parts: [
                    {
                        type: "dynamic-tool",
                        input: { command: "printf '\u0000'" },
                        output: { text: "tool output\u0000" },
                    },
                ],
            } as any,
            createSensitiveWordFilter({ enabled: false }),
        );

        expect(JSON.stringify(message)).not.toContain("\\u0000");
        expect((message.parts[0] as any).output.text).toBe("tool output");
    });

    it("marks an unexpected persistence failure as terminal", async () => {
        const markFailure = jest.fn(async () => undefined);
        const error = new Error("database unavailable");
        const result = await persistOpencodeAssistantMessageSafely({
            persist: async () => {
                throw error;
            },
            markFailure,
        });

        expect(result).toEqual({ persisted: false, error });
        expect(markFailure).toHaveBeenCalledTimes(1);
    });
});
