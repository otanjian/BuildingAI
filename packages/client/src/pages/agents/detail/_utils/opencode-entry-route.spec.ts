import { describe, expect, it } from "vitest";

import { resolveOpencodeEntryRoute } from "./opencode-entry-route";

describe("resolveOpencodeEntryRoute", () => {
  const base = {
    agentId: "agent-1",
    isOpencodeAgent: true,
    conversationId: undefined,
  };

  it("waits for history before choosing a route", () => {
    expect(resolveOpencodeEntryRoute({ ...base, historyStatus: "loading" })).toEqual({
      kind: "wait",
    });
  });

  it("opens the first conversation from the updatedAt-descending history response", () => {
    expect(
      resolveOpencodeEntryRoute({
        ...base,
        historyStatus: "success",
        conversations: [{ id: "latest" }, { id: "older" }],
      }),
    ).toEqual({ kind: "open", conversationId: "latest" });
  });

  it("creates one draft only when history loaded successfully and is empty", () => {
    expect(
      resolveOpencodeEntryRoute({ ...base, historyStatus: "success", conversations: [] }),
    ).toEqual({ kind: "create-draft" });
  });

  it("keeps an error retryable without creating a draft", () => {
    expect(resolveOpencodeEntryRoute({ ...base, historyStatus: "error" })).toEqual({
      kind: "error",
    });
  });

  it("never replaces an explicit conversation route", () => {
    expect(
      resolveOpencodeEntryRoute({
        ...base,
        conversationId: "linked-session",
        historyStatus: "success",
        conversations: [{ id: "latest" }],
      }),
    ).toEqual({ kind: "stay" });
  });
});
