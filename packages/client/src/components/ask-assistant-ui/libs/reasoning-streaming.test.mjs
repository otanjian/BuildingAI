import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isReasoningPartStreaming,
  partitionReasoningPartsForDisplay,
} from "./reasoning-streaming.ts";

describe("isReasoningPartStreaming", () => {
  it("returns false when message is not streaming", () => {
    const parts = [{ type: "reasoning", text: "plan" }];
    assert.equal(isReasoningPartStreaming(parts, 0, false), false);
  });

  it("returns false when tool parts follow reasoning", () => {
    const parts = [
      { type: "reasoning", text: "plan" },
      { type: "tool-update_document", toolCallId: "1", state: "output-available", input: {} },
    ];
    assert.equal(isReasoningPartStreaming(parts, 0, true), false);
  });

  it("returns true when only reasoning exists while streaming", () => {
    const parts = [{ type: "reasoning", text: "still thinking" }];
    assert.equal(isReasoningPartStreaming(parts, 0, true), true);
  });
});

describe("partitionReasoningPartsForDisplay", () => {
  it("collapses all completed reasoning when the turn is finished", () => {
    const parts = [
      { type: "reasoning", text: "first" },
      { type: "reasoning", text: "second" },
      { type: "text", text: "answer" },
    ];

    const result = partitionReasoningPartsForDisplay(parts, false);

    assert.deepEqual(
      result.completed.map((item) => item.part.text),
      ["first", "second"],
    );
    assert.deepEqual(result.active, []);
    assert.equal(result.shouldCollapseCompleted, true);
  });

  it("keeps only the active streaming reasoning outside the completed group", () => {
    const parts = [
      { type: "reasoning", text: "done thought", state: "done" },
      { type: "tool-update_document", toolCallId: "1", state: "output-available", input: {} },
      { type: "reasoning", text: "still thinking" },
    ];

    const result = partitionReasoningPartsForDisplay(parts, true);

    assert.deepEqual(
      result.completed.map((item) => item.part.text),
      ["done thought"],
    );
    assert.deepEqual(
      result.active.map((item) => item.part.text),
      ["still thinking"],
    );
    assert.equal(result.shouldCollapseCompleted, true);
  });

  it("does not collapse when nothing is completed yet", () => {
    const parts = [{ type: "reasoning", text: "still thinking" }];
    const result = partitionReasoningPartsForDisplay(parts, true);

    assert.equal(result.shouldCollapseCompleted, false);
    assert.deepEqual(
      result.active.map((item) => item.part.text),
      ["still thinking"],
    );
    assert.deepEqual(result.completed, []);
  });

  it("skips empty reasoning parts", () => {
    const parts = [
      { type: "reasoning", text: "   " },
      { type: "reasoning", text: "real" },
    ];

    const result = partitionReasoningPartsForDisplay(parts, false);

    assert.deepEqual(
      result.completed.map((item) => item.part.text),
      ["real"],
    );
  });
});
