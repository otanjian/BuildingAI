import { describe, expect, it } from "vitest";

import { resolvePendingClearForStreamImport } from "./pending-clear-stream-import";

describe("resolvePendingClearForStreamImport", () => {
  it("clears pending and skips import when stream is empty", () => {
    expect(
      resolvePendingClearForStreamImport({ pendingClear: true, streamMessageCount: 0 }),
    ).toEqual({ pendingClear: false, shouldImport: false });
  });

  it("imports live registry messages even when pendingClear is set", () => {
    expect(
      resolvePendingClearForStreamImport({ pendingClear: true, streamMessageCount: 2 }),
    ).toEqual({ pendingClear: false, shouldImport: true });
  });

  it("imports normally when not pending clear", () => {
    expect(
      resolvePendingClearForStreamImport({ pendingClear: false, streamMessageCount: 1 }),
    ).toEqual({ pendingClear: false, shouldImport: true });
  });
});
