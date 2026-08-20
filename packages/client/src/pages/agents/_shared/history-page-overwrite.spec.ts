import { describe, expect, it } from "vitest";

import { shouldApplyHistoryPageToChat } from "./history-page-overwrite";

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

  it("does not replace a live Chat when switching back mid-turn", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: false,
        switched: true,
        liveMessageCount: 4,
      }),
    ).toBe(false);
  });

  it("does not replace a live Chat if a history fetch was already in flight", () => {
    expect(
      shouldApplyHistoryPageToChat({
        shouldLoadInitial: true,
        switched: false,
        liveMessageCount: 2,
      }),
    ).toBe(false);
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
});
