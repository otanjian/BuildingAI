import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getOpencodeConversationTelemetry,
  recordOpencodeConversationMetric,
  resetOpencodeConversationTelemetry,
} from "./opencode-conversation-telemetry";

describe("OpenCode conversation telemetry", () => {
  beforeEach(resetOpencodeConversationTelemetry);

  it("aggregates content-free cache, projection, and fallback signals", () => {
    recordOpencodeConversationMetric("cache_hit", { scope: "detail" });
    recordOpencodeConversationMetric("cache_miss", { scope: "detail" });
    recordOpencodeConversationMetric("projection_applied", { truncated: true });
    recordOpencodeConversationMetric("poll_fallback");

    expect(getOpencodeConversationTelemetry()).toEqual({
      cache_hit: 1,
      cache_miss: 1,
      projection_applied: 1,
      projection_truncated: 1,
      poll_fallback: 1,
    });
  });

  it("never stores arbitrary message fields", () => {
    recordOpencodeConversationMetric("cache_hit", {
      scope: "detail",
      content: "must not persist",
    } as never);
    expect(JSON.stringify(getOpencodeConversationTelemetry())).not.toContain("must not persist");
    expect(vi.fn()).not.toHaveBeenCalled();
  });
});
