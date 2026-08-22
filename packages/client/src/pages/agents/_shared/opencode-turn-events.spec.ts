import { describe, expect, it, vi } from "vitest";

import { subscribeOpencodeTurnEvents } from "./opencode-turn-events";

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

describe("subscribeOpencodeTurnEvents", () => {
  it("parses chunked projection and terminal snapshots in order", async () => {
    const fetcher = vi.fn(async () =>
      sseResponse([
        'id: 4\nevent: projection\ndata: {"conversationId":"c-1",',
        '"turnId":"t-1","version":"4","projection":{"parts":[]}}\n\n',
        'id: terminal:4\nevent: terminal\ndata: {"conversationId":"c-1","turnId":"t-1","status":"completed","assistantMessageId":"m-1"}\n\n',
      ]),
    );
    const events: Array<{ type: string; id: string }> = [];

    await subscribeOpencodeTurnEvents({
      url: "/events",
      headers: { Authorization: "Bearer token" },
      signal: new AbortController().signal,
      lastEventId: "3",
      fetcher,
      onEvent: (event) => {
        events.push({ type: event.type, id: event.id });
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      "/events",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "text/event-stream",
          Authorization: "Bearer token",
          "Last-Event-ID": "3",
        }),
      }),
    );
    expect(events).toEqual([
      { type: "projection", id: "4" },
      { type: "terminal", id: "terminal:4" },
    ]);
  });

  it("ignores malformed and heartbeat frames", async () => {
    const onEvent = vi.fn();
    await subscribeOpencodeTurnEvents({
      url: "/events",
      headers: {},
      signal: new AbortController().signal,
      fetcher: vi.fn(async () =>
        sseResponse([": heartbeat\n\n", "event: projection\ndata: not-json\n\n"]),
      ),
      onEvent,
    });
    expect(onEvent).not.toHaveBeenCalled();
  });
});
