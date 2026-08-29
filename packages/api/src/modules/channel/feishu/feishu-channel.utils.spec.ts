import {
    buildFeishuAnonymousIdentifier,
    buildFeishuStreamingCard,
    extractFeishuText,
    maskSecret,
    normalizeAgentAccessToken,
    parseAgentStreamEvent,
    parseStoredFeishuConfig,
    validateFeishuConfig,
} from "./feishu-channel.utils";

describe("Feishu channel helpers", () => {
    it("validates required configuration fields", () => {
        expect(() =>
            validateFeishuConfig({
                agentId: "agent-1",
                appId: "app-id",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: false,
            }),
        ).not.toThrow();

        expect(() => validateFeishuConfig({ agentId: "agent-1" } as never)).toThrow(
            "Feishu app ID is required",
        );
    });

    it("extracts plain text from Feishu message content", () => {
        expect(extractFeishuText(JSON.stringify({ text: "@_user_1  查询库存" }), "@_user_1")).toBe(
            "查询库存",
        );
        expect(extractFeishuText(JSON.stringify({ text: "hello" }))).toBe("hello");
        expect(extractFeishuText("not-json")).toBe("");
    });

    it("creates stable anonymous identifiers and masks secrets", () => {
        expect(buildFeishuAnonymousIdentifier("agent-1", "chat-1")).toBe("feishu:agent-1:chat-1");
        expect(maskSecret("abcdefghijkl")).toBe("abcd••••ijkl");
        expect(maskSecret("abc")).toBe("••••");
    });

    it("accepts a published agent URL as a convenience token format", () => {
        expect(
            normalizeAgentAccessToken(
                "https://ai.example.com/agents/agent-1/published-token",
                "agent-1",
            ),
        ).toBe("published-token");
        expect(normalizeAgentAccessToken("raw-token", "agent-1")).toBe("raw-token");
    });

    it("parses stored JSON while rejecting malformed entries", () => {
        expect(
            parseStoredFeishuConfig(
                JSON.stringify({
                    agentId: "agent-1",
                    appId: "app-id",
                    appSecret: "secret",
                    agentAccessToken: "token",
                    enabled: true,
                }),
                "agent-1",
            ).agentId,
        ).toBe("agent-1");
        expect(() => parseStoredFeishuConfig("{}", "agent-1")).toThrow();
    });

    it("parses UI-message SSE events used by the published agent", () => {
        expect(
            parseAgentStreamEvent(
                `data: ${JSON.stringify({ type: "text-delta", delta: "hello" })}`,
            ),
        ).toEqual({
            type: "text-delta",
            delta: "hello",
        });
        expect(
            parseAgentStreamEvent(
                `data: ${JSON.stringify({ type: "data-conversation-id", data: "conversation-1" })}`,
            ),
        ).toEqual({ type: "data-conversation-id", data: "conversation-1" });
        expect(parseAgentStreamEvent("event: message")).toBeUndefined();
        expect(parseAgentStreamEvent("data: [DONE]")).toBeUndefined();
    });

    it("builds a CardKit card with native streaming enabled", () => {
        expect(buildFeishuStreamingCard("Thinking...")).toEqual(
            expect.objectContaining({
                schema: "2.0",
                config: expect.objectContaining({ streaming_mode: true }),
                body: {
                    elements: [
                        expect.objectContaining({
                            tag: "markdown",
                            element_id: "stream_md",
                            content: "Thinking...",
                        }),
                    ],
                },
            }),
        );
    });
});
