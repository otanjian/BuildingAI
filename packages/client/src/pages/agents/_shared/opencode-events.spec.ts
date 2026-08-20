import { describe, expect, it, vi } from "vitest";

import { subscribeOpencodeSessionEvents } from "./opencode-events";

describe("subscribeOpencodeSessionEvents", () => {
  it("rejects with onError when HTTP status is not ok", async () => {
    const onError = vi.fn();
    const onSnapshot = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    });

    const controller = new AbortController();
    await subscribeOpencodeSessionEvents({
      url: "http://example.com/events",
      headers: {},
      signal: controller.signal,
      onSnapshot,
      onError,
    });

    expect(onError).toHaveBeenCalled();
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("emits snapshots and done on SSE chunks", async () => {
    const encoder = new TextEncoder();
    const body = [
      'data: {"type":"message.updated","properties":{"info":{"id":"m1","role":"assistant","finish":null}}}\n\n',
      'data: {"type":"message.part.updated","properties":{"part":{"id":"p1","messageID":"m1","type":"text","text":"hi"}}}\n\n',
      'data: {"type":"session.idle","properties":{"sessionID":"s1"}}\n\n',
    ]
      .map((chunk) => encoder.encode(chunk))
      .values();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: async () => {
            const next = body.next();
            return next.done ? { done: true } : { done: false, value: next.value };
          },
        }),
      },
    });

    const snapshots: Array<Array<Record<string, unknown>>> = [];
    const onSnapshot = vi.fn((messages) => snapshots.push(messages));
    const onDone = vi.fn();
    const onError = vi.fn();

    const controller = new AbortController();
    await subscribeOpencodeSessionEvents({
      url: "http://example.com/events",
      headers: {},
      signal: controller.signal,
      onSnapshot,
      onDone,
      onError,
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith("idle");
    expect(snapshots.length).toBeGreaterThan(0);
    const last = snapshots[snapshots.length - 1];
    expect(last[0].info).toMatchObject({ id: "m1", role: "assistant" });
    expect(last[0].parts).toEqual([{ id: "p1", messageID: "m1", type: "text", text: "hi" }]);
  });
});
