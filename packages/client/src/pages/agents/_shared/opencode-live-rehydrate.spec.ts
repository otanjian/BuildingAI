import { describe, expect, it } from "vitest";

import { shouldRehydrateOpencodeLive } from "./opencode-live-rehydrate";

describe("shouldRehydrateOpencodeLive", () => {
  it("returns true when turn is running and chat is idle (e.g. after refresh)", () => {
    expect(
      shouldRehydrateOpencodeLive({
        isOpencodeTurnRunning: true,
        hasStreamingRegistryChat: false,
        chatStatus: "ready",
      }),
    ).toBe(true);
  });

  it("returns false when the focused chat is already streaming", () => {
    expect(
      shouldRehydrateOpencodeLive({
        isOpencodeTurnRunning: true,
        hasStreamingRegistryChat: true,
        chatStatus: "streaming",
      }),
    ).toBe(false);
  });

  it("returns false when turn is not running", () => {
    expect(
      shouldRehydrateOpencodeLive({
        isOpencodeTurnRunning: false,
        hasStreamingRegistryChat: false,
        chatStatus: "ready",
      }),
    ).toBe(false);
  });

  it("rehydrates when registry says streaming but chat status is ready (desync)", () => {
    expect(
      shouldRehydrateOpencodeLive({
        isOpencodeTurnRunning: true,
        hasStreamingRegistryChat: true,
        chatStatus: "ready",
      }),
    ).toBe(true);
  });
});
