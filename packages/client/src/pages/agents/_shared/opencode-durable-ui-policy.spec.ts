import { describe, expect, it } from "vitest";

import { opencodeDurableUiPolicy } from "./opencode-durable-ui-policy";

describe("durable OpenCode UI policy shared by detail and site chat", () => {
  it("disables edit, regenerate, branch switching, and historical parent sends", () => {
    expect(opencodeDurableUiPolicy(true)).toEqual({
      canEditPersistedMessage: false,
      canRegenerate: false,
      canSwitchBranch: false,
      sendParentId: undefined,
    });
  });

  it("leaves the legacy/non-OpenCode capabilities enabled", () => {
    expect(opencodeDurableUiPolicy(false)).toEqual({
      canEditPersistedMessage: true,
      canRegenerate: true,
      canSwitchBranch: true,
      sendParentId: null,
    });
  });
});
