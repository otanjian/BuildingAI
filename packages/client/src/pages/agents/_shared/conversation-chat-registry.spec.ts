import { describe, expect, it } from "vitest";

import {
  canStartLiveStream,
  ConversationChatRegistry,
  DEFAULT_MAX_CONCURRENT_LIVE_STREAMS,
} from "./conversation-chat-registry";

describe("ConversationChatRegistry", () => {
  it("creates and reuses chat by conversation id", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    let created = 0;
    const factory = () => {
      created += 1;
      return { id: `chat-${created}` };
    };

    const first = registry.getOrCreate("conv-a", factory);
    const second = registry.getOrCreate("conv-a", factory);

    expect(first).toBe(second);
    expect(created).toBe(1);
    expect(registry.get("conv-a")).toBe(first);
  });

  it("tracks active conversation without disposing others", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    registry.getOrCreate("a", () => ({ id: "a" }));
    registry.getOrCreate("b", () => ({ id: "b" }));

    registry.setActive("b");
    expect(registry.getActive()).toBe("b");
    expect(registry.get("a")).toEqual({ id: "a" });
    expect(registry.get("b")).toEqual({ id: "b" });
  });

  it("disposes a conversation entry", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    registry.getOrCreate("a", () => ({ id: "a" }));
    expect(registry.dispose("a")).toBe(true);
    expect(registry.get("a")).toBeUndefined();
    expect(registry.dispose("a")).toBe(false);
  });

  it("rekeys a provisional entry onto a stable conversation id", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    const chat = registry.getOrCreate("new-1", () => ({ id: "chat" }));
    registry.setActive("new-1");
    registry.setStatus("new-1", "streaming");

    expect(registry.rekey("new-1", "uuid-a")).toBe(true);
    expect(registry.get("new-1")).toBeUndefined();
    expect(registry.get("uuid-a")).toBe(chat);
    expect(registry.getActive()).toBe("uuid-a");
    expect(registry.isStreaming("uuid-a")).toBe(true);
  });

  it("counts streaming entries", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    registry.getOrCreate("a", () => ({ id: "a" }));
    registry.getOrCreate("b", () => ({ id: "b" }));
    registry.setStatus("a", "streaming");
    registry.setStatus("b", "idle");
    expect(registry.countStreaming()).toBe(1);
    registry.setStatus("b", "streaming");
    expect(registry.countStreaming()).toBe(2);
  });

  it("evicts only completed idle entries older than threshold", () => {
    const registry = new ConversationChatRegistry<{ id: string }>();
    const now = 10_000;
    registry.getOrCreate("keep-streaming", () => ({ id: "s" }));
    registry.setStatus("keep-streaming", "streaming");

    registry.getOrCreate("keep-recent", () => ({ id: "r" }));
    registry.setStatus("keep-recent", "completed");

    registry.getOrCreate("evict-me", () => ({ id: "e" }));
    registry.setStatus("evict-me", "completed");
    // Force older updatedAt for evict-me
    const entry = registry.getEntry("evict-me");
    if (entry) entry.updatedAt = now - 60_000;

    const evicted = registry.evictCompletedIdle({ olderThanMs: 30_000, now });
    expect(evicted).toEqual(["evict-me"]);
    expect(registry.get("evict-me")).toBeUndefined();
    expect(registry.get("keep-streaming")).toBeDefined();
    expect(registry.get("keep-recent")).toBeDefined();
  });
});

describe("canStartLiveStream", () => {
  it("allows when under the default cap", () => {
    expect(
      canStartLiveStream({ streamingCount: 3 }),
    ).toEqual({ allowed: true });
    expect(DEFAULT_MAX_CONCURRENT_LIVE_STREAMS).toBe(4);
  });

  it("refuses when at cap for a new conversation", () => {
    expect(
      canStartLiveStream({ streamingCount: 4 }),
    ).toEqual({
      allowed: false,
      reason: "Too many conversations are generating at once. Wait for one to finish.",
    });
  });

  it("allows when the target conversation is already streaming", () => {
    expect(
      canStartLiveStream({
        streamingCount: 4,
        conversationAlreadyStreaming: true,
      }),
    ).toEqual({ allowed: true });
  });
});
