import { describe, expect, it } from "vitest";

import { isOpencodeTurnRunning } from "./opencode-turn-running";

describe("isOpencodeTurnRunning (client)", () => {
  it("reads metadata flag", () => {
    expect(isOpencodeTurnRunning({ opencodeTurnStatus: "running" })).toBe(true);
    expect(isOpencodeTurnRunning({ opencodeTurnStatus: "completed" })).toBe(false);
    expect(isOpencodeTurnRunning(undefined)).toBe(false);
  });
});
