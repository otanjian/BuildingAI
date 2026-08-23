import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import {
  mergeHistoryPageWithLiveMessages,
  shouldApplyHistoryPageToChat,
} from "./history-page-overwrite";

describe("shouldApplyHistoryPageToChat", () => {
  it("loads history when the Chat is empty on first open", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: true,
        switched: false,
        liveMessageCount: 0,
      }),
    ).toBe(true);
  });

  it("loads history when switching to an idle conversation with an empty Chat", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: false,
        switched: true,
        liveMessageCount: 0,
      }),
    ).toBe(true);
  });

  it("loads history for reconciliation when switching back mid-turn", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: false,
        switched: true,
        liveMessageCount: 4,
      }),
    ).toBe(true);
  });

  it("keeps an initial history load eligible for reconciliation with live messages", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: true,
        switched: false,
        liveMessageCount: 2,
      }),
    ).toBe(true);
  });

  it("does nothing when there is no reason to fetch", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: false,
        switched: false,
        liveMessageCount: 0,
      }),
    ).toBe(false);
  });

  it("does not fetch history for a local draft during route switching", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: false,
        switched: true,
        liveMessageCount: 0,
        skipHistoryFetch: true,
      }),
    ).toBe(false);
  });

  it("preserves persisted history when a live user message arrives before page one", () => {
    const history: UIMessage[] = [
      {
        id: "db-user-1",
        role: "user",
        parts: [{ type: "text", text: "Earlier" }],
        metadata: { sequence: 0 },
      },
      {
        id: "db-assistant-1",
        role: "assistant",
        parts: [{ type: "text", text: "Earlier reply" }],
        metadata: { sequence: 1 },
      },
    ];
    const live: UIMessage[] = [
      {
        id: "local-user-2",
        role: "user",
        parts: [{ type: "text", text: "Are you done?" }],
      },
    ];

    expect(
      mergeHistoryPageWithLiveMessages(history, live, () => undefined).map((message) => message.id),
    ).toEqual(["db-user-1", "db-assistant-1", "local-user-2"]);
  });

  it("deduplicates a live message that has already been persisted", () => {
    const history: UIMessage[] = [
      {
        id: "db-user-1",
        role: "user",
        parts: [{ type: "text", text: "Earlier" }],
        metadata: { sequence: 0 },
      },
      {
        id: "db-user-2",
        role: "user",
        parts: [{ type: "text", text: "Are you done?" }],
        metadata: { sequence: 1 },
      },
    ];
    const live: UIMessage[] = [
      {
        id: "local-user-2",
        role: "user",
        parts: [{ type: "text", text: "Are you done?" }],
      },
    ];

    expect(
      mergeHistoryPageWithLiveMessages(history, live, (id) =>
        id === "local-user-2" ? "db-user-2" : undefined,
      ).map((message) => message.id),
    ).toEqual(["db-user-1", "local-user-2"]);
  });
});
