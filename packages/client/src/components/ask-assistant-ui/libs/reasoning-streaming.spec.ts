import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { isReasoningPartStreaming } from "./reasoning-streaming";

describe("isReasoningPartStreaming", () => {
  it("returns false when message is not streaming", () => {
    const parts: UIMessage["parts"] = [{ type: "reasoning", text: "plan" }];
    expect(isReasoningPartStreaming(parts, 0, false)).toBe(false);
  });

  it("returns false when tool parts follow reasoning", () => {
    const parts: UIMessage["parts"] = [
      { type: "reasoning", text: "plan" },
      { type: "tool-update_document", toolCallId: "1", state: "output-available", input: {} },
    ];
    expect(isReasoningPartStreaming(parts, 0, true)).toBe(false);
  });

  it("returns true when only reasoning exists while streaming", () => {
    const parts: UIMessage["parts"] = [{ type: "reasoning", text: "still thinking" }];
    expect(isReasoningPartStreaming(parts, 0, true)).toBe(true);
  });
});
