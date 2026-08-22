import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

import { OpencodeConversationStore } from "./opencode-conversation-store";

const message = (id: string, role: "user" | "assistant", text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

describe("OpencodeConversationStore", () => {
  it("creates a stable UUID draft and restores conversation-owned UI state", () => {
    const store = new OpencodeConversationStore({ createId: () => "draft-uuid" });
    expect(store.createDraft()).toBe("draft-uuid");
    store.setMessages("draft-uuid", [message("u-1", "user", "hello")]);
    store.setDraft("draft-uuid", "unfinished input");
    store.setScroll("draft-uuid", { top: 180, atBottom: false });

    store.activate("other");
    store.activate("draft-uuid");
    expect(store.get("draft-uuid")).toMatchObject({
      localOnly: true,
      draft: "unfinished input",
      scroll: { top: 180, atBottom: false },
    });
    expect(store.get("draft-uuid").messages.map((item) => item.id)).toEqual(["u-1"]);
  });

  it("keeps optimistic turns and applies only newer full projections", () => {
    const store = new OpencodeConversationStore();
    store.activate("c-1");
    store.beginTurn("c-1", {
      turnId: "t-1",
      userMessage: message("opencode-user:t-1", "user", "build it"),
    });
    expect(store.get("c-1").messages.map((item) => item.id)).toEqual(["opencode-user:t-1"]);

    expect(
      store.applyProjection("c-1", {
        turnId: "t-1",
        version: "2",
        projection: { parts: [{ type: "text", text: "half" }] },
      }),
    ).toBe(true);
    expect(
      store.applyProjection("c-1", {
        turnId: "t-1",
        version: "1",
        projection: { parts: [{ type: "text", text: "stale" }] },
      }),
    ).toBe(false);
    expect(store.get("c-1").messages.at(-1)?.parts).toEqual([{ type: "text", text: "half" }]);
  });

  it("atomically replaces the temporary projection with durable history", () => {
    const store = new OpencodeConversationStore();
    store.beginTurn("c-1", {
      turnId: "t-1",
      userMessage: message("opencode-user:t-1", "user", "build it"),
    });
    store.applyProjection("c-1", {
      turnId: "t-1",
      version: "3",
      projection: { parts: [{ type: "text", text: "temporary" }] },
    });
    store.completeTurn("c-1", "t-1", [
      message("db-user", "user", "build it"),
      message("db-assistant", "assistant", "finished"),
    ]);

    expect(store.get("c-1")).toMatchObject({ activeTurnId: null, projectionVersion: "0" });
    expect(store.get("c-1").messages.map((item) => item.id)).toEqual(["db-user", "db-assistant"]);
  });

  it("keeps a pending question alongside the live projection and clears it on completion", () => {
    const store = new OpencodeConversationStore();
    store.beginTurn("c-1", {
      turnId: "t-1",
      userMessage: message("u-1", "user", "choose"),
    });
    store.setPendingQuestion("c-1", {
      requestId: "q-1",
      sessionId: "ses-1",
      questions: [{
        header: "Choice",
        question: "Pick one",
        options: [{ label: "A", description: "First" }],
        multiple: false,
        custom: true,
      }],
    });
    expect(store.get("c-1").pendingQuestion?.requestId).toBe("q-1");
    store.completeTurn("c-1", "t-1", [message("done", "assistant", "finished")]);
    expect(store.get("c-1").pendingQuestion).toBeNull();
  });

  it("notifies subscribers and evicts least-recent idle entries at the cap", () => {
    const store = new OpencodeConversationStore({ maxEntries: 3 });
    const listener = vi.fn();
    store.subscribe(listener);
    store.activate("protected");
    store.beginTurn("running", {
      turnId: "t-running",
      userMessage: message("u-running", "user", "run"),
    });
    store.setMessages("idle-old", [message("old", "assistant", "old")]);
    store.setMessages("idle-new", [message("new", "assistant", "new")]);

    expect(listener).toHaveBeenCalled();
    expect(store.has("protected")).toBe(true);
    expect(store.has("running")).toBe(true);
    expect(store.has("idle-old")).toBe(false);
    expect(store.has("idle-new")).toBe(true);
  });
});
