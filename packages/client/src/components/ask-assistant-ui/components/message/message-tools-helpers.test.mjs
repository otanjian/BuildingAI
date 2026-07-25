import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isCompletedToolState,
  partitionToolPartsForDisplay,
} from "./message-tools-helpers.ts";

describe("message-tools-helpers", () => {
  it("treats terminal states as completed", () => {
    assert.equal(isCompletedToolState("output-available"), true);
    assert.equal(isCompletedToolState("output-error"), true);
    assert.equal(isCompletedToolState("output-denied"), true);
    assert.equal(isCompletedToolState("input-available"), false);
    assert.equal(isCompletedToolState("input-streaming"), false);
    assert.equal(isCompletedToolState("approval-requested"), false);
  });

  it("partitions completed tools for collapse and keeps active tools visible", () => {
    const parts = [
      { type: "tool-a", toolCallId: "1", state: "output-available" },
      { type: "tool-b", toolCallId: "2", state: "output-error" },
      { type: "tool-c", toolCallId: "3", state: "input-available" },
      { type: "tool-d", toolCallId: "4", state: "output-available" },
    ];

    const result = partitionToolPartsForDisplay(parts);

    assert.deepEqual(
      result.completed.map((p) => p.toolCallId),
      ["1", "2", "4"],
    );
    assert.deepEqual(
      result.active.map((p) => p.toolCallId),
      ["3"],
    );
    assert.equal(result.shouldCollapseCompleted, true);
  });

  it("collapses completed tools whenever any have finished", () => {
    const parts = [{ type: "tool-a", toolCallId: "1", state: "output-available" }];
    const result = partitionToolPartsForDisplay(parts);
    assert.equal(result.shouldCollapseCompleted, true);
    assert.equal(result.completed.length, 1);
  });

  it("does not collapse when nothing is completed yet", () => {
    const parts = [{ type: "tool-a", toolCallId: "1", state: "input-available" }];
    const result = partitionToolPartsForDisplay(parts);
    assert.equal(result.shouldCollapseCompleted, false);
    assert.equal(result.active.length, 1);
  });
});
