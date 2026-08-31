import { WecomStreamingReply } from "./wecom-streaming-reply";

describe("WecomStreamingReply", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("sends accumulated updates at a rate-safe interval and always finalizes", async () => {
        const replyStream = jest.fn().mockResolvedValue({});
        const reply = new WecomStreamingReply(
            { replyStream } as never,
            { headers: { req_id: "req-1" } } as never,
            "stream-1",
            () => true,
            2_500,
        );

        reply.update("A");
        await jest.advanceTimersByTimeAsync(0);
        expect(replyStream).toHaveBeenCalledWith(expect.anything(), "stream-1", "A", false);

        reply.update("AB");
        reply.update("ABC");
        await jest.advanceTimersByTimeAsync(2_500);
        expect(replyStream).toHaveBeenLastCalledWith(expect.anything(), "stream-1", "ABC", false);

        const finish = reply.finish("ABCD");
        await Promise.resolve();
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(2_500);
        await expect(finish).resolves.toBe(true);
        expect(replyStream).toHaveBeenLastCalledWith(expect.anything(), "stream-1", "ABCD", true);
    });

    it("does not send after its connection guard becomes stale", async () => {
        const replyStream = jest.fn().mockResolvedValue({});
        let active = true;
        const reply = new WecomStreamingReply(
            { replyStream } as never,
            { headers: { req_id: "req-2" } } as never,
            "stream-2",
            () => active,
        );

        reply.update("partial");
        await jest.advanceTimersByTimeAsync(0);
        active = false;

        await expect(reply.finish("final")).resolves.toBe(false);
        expect(replyStream).toHaveBeenCalledTimes(1);
    });

    it("truncates multibyte content below the WeCom byte ceiling", async () => {
        const replyStream = jest.fn().mockResolvedValue({});
        const reply = new WecomStreamingReply(
            { replyStream } as never,
            { headers: { req_id: "req-3" } } as never,
            "stream-3",
            () => true,
            2_500,
            10,
        );

        await reply.finish("你好世界");

        const sent = replyStream.mock.calls[0][2] as string;
        expect(Buffer.byteLength(sent, "utf8")).toBeLessThanOrEqual(10);
        expect(sent.endsWith("…")).toBe(true);
    });
});
