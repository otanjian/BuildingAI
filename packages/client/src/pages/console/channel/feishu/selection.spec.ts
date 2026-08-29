import { describe, expect, it } from "vitest";

import { filterFeishuAgents, resolveFeishuAgentId } from "./selection";

const agents = [{ id: "first" }, { id: "saved" }, { id: "manual" }];

describe("resolveFeishuAgentId", () => {
  it("restores the saved channel agent instead of defaulting to the first agent", () => {
    expect(
      resolveFeishuAgentId({
        currentAgentId: "",
        agents,
        channels: [{ agentId: "saved" }],
        hasManualSelection: false,
      }),
    ).toBe("saved");
  });

  it("keeps a manually selected agent when channel data arrives", () => {
    expect(
      resolveFeishuAgentId({
        currentAgentId: "manual",
        agents,
        channels: [{ agentId: "saved" }],
        hasManualSelection: true,
      }),
    ).toBe("manual");
  });

  it("falls back to the first known agent when no channel is saved", () => {
    expect(
      resolveFeishuAgentId({
        currentAgentId: "missing",
        agents,
        channels: [],
        hasManualSelection: false,
      }),
    ).toBe("first");
  });

  it("returns an empty value while the agent list is empty", () => {
    expect(
      resolveFeishuAgentId({
        currentAgentId: "",
        agents: [],
        channels: [{ agentId: "saved" }],
        hasManualSelection: false,
      }),
    ).toBe("");
  });
});

describe("filterFeishuAgents", () => {
  it("keeps only standard agents for the Feishu selector", () => {
    expect(
      filterFeishuAgents([
        { id: "erpnext", createMode: "direct" },
        { id: "sap", createMode: "opencode" },
        { id: "coze", createMode: "coze" },
      ]),
    ).toEqual([{ id: "erpnext", createMode: "direct" }]);
  });
});
