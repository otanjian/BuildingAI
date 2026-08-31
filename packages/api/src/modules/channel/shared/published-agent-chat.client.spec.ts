import { PublishedAgentChatClient } from "./published-agent-chat.client";

function sseResponse(lines: string[]): Response {
    const encoder = new TextEncoder();
    return new Response(
        new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(lines.join("\n") + "\n"));
                controller.close();
            },
        }),
        { status: 200 },
    );
}

describe("PublishedAgentChatClient", () => {
    const originalFetch = global.fetch;

    afterEach(() => {
        global.fetch = originalFetch;
        jest.useRealTimers();
    });

    it("streams accumulated text and returns the conversation id", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValue(
                sseResponse([
                    `data: ${JSON.stringify({ type: "text-delta", delta: "hello" })}`,
                    `data: ${JSON.stringify({ type: "text-delta", delta: " world" })}`,
                    `data: ${JSON.stringify({ type: "data-conversation-id", data: "conversation-1" })}`,
                    "data: [DONE]",
                ]),
            );
        const onText = jest.fn();

        const result = await new PublishedAgentChatClient().stream({
            apiOrigin: "https://api.example.com/",
            agentAccessToken: "token",
            anonymousIdentifier: "channel:connection:chat",
            message: "question",
            conversationId: "previous-conversation",
            onText,
        });

        expect(result).toEqual({ answer: "hello world", conversationId: "conversation-1" });
        expect(onText).toHaveBeenNthCalledWith(1, "hello");
        expect(onText).toHaveBeenNthCalledWith(2, "hello world");
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.example.com/v1/chat-messages",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    authorization: "Bearer token",
                    "x-anonymous-identifier": "channel:connection:chat",
                }),
            }),
        );
        expect(JSON.parse(String((global.fetch as jest.Mock).mock.calls[0][1].body))).toEqual(
            expect.objectContaining({
                responseMode: "streaming",
                conversationId: "previous-conversation",
            }),
        );
    });

    it("ignores malformed SSE lines", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValue(
                sseResponse(["event: message", "data: not-json", "data: null", "data: [DONE]"]),
            );

        await expect(
            new PublishedAgentChatClient().stream({
                apiOrigin: "https://api.example.com",
                agentAccessToken: "token",
                anonymousIdentifier: "anonymous",
                message: "question",
            }),
        ).resolves.toEqual({ answer: "", conversationId: undefined });
    });

    it("reports empty or malformed upstream failures safely", async () => {
        global.fetch = jest
            .fn()
            .mockResolvedValue(
                new Response("not-json", { status: 502, statusText: "Bad Gateway" }),
            );

        await expect(
            new PublishedAgentChatClient().stream({
                apiOrigin: "https://api.example.com",
                agentAccessToken: "token",
                anonymousIdentifier: "anonymous",
                message: "question",
            }),
        ).rejects.toThrow("Agent request returned an unusable response (502 Bad Gateway)");
    });

    it("aborts requests that exceed the configured timeout", async () => {
        jest.useFakeTimers();
        global.fetch = jest.fn((_url, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () =>
                    reject(new DOMException("Aborted", "AbortError")),
                );
            });
        }) as typeof fetch;
        const promise = new PublishedAgentChatClient().stream({
            apiOrigin: "https://api.example.com",
            agentAccessToken: "token",
            anonymousIdentifier: "anonymous",
            message: "question",
            timeoutMs: 100,
        });
        const expectation = expect(promise).rejects.toThrow("Agent request timed out");

        await jest.advanceTimersByTimeAsync(101);

        await expectation;
    });
});
