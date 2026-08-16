import { describe, expect, it } from "vitest";

import {
  agentHistoryAgentNameClassName,
  resolveAgentHistoryTitleDisplay,
} from "./agent-history-title";

describe("resolveAgentHistoryTitleDisplay", () => {
  it("returns title-only accessible label when agentName is missing", () => {
    expect(resolveAgentHistoryTitleDisplay({ title: "当前的项目结构" })).toEqual({
      title: "当前的项目结构",
      agentName: undefined,
      accessibleLabel: "当前的项目结构",
      hasAgentName: false,
    });
  });

  it("trims agentName and builds accessible label with agent + title", () => {
    expect(
      resolveAgentHistoryTitleDisplay({
        title: "当前的项目结构",
        agentName: "  Bowi AI开发助手  ",
      }),
    ).toEqual({
      title: "当前的项目结构",
      agentName: "Bowi AI开发助手",
      accessibleLabel: "Bowi AI开发助手 当前的项目结构",
      hasAgentName: true,
    });
  });

  it("treats blank agentName as absent", () => {
    expect(
      resolveAgentHistoryTitleDisplay({ title: "hello", agentName: "   " }),
    ).toMatchObject({ hasAgentName: false, agentName: undefined });
  });
});

describe("agentHistoryAgentNameClassName", () => {
  it("hides by default and reveals on the sidebar hover group", () => {
    const className = agentHistoryAgentNameClassName("menu-sub-item");
    expect(className).toContain("hidden");
    expect(className).toContain("group-hover/menu-sub-item:inline");
    expect(className).not.toContain("group-hover/command-item:inline");
  });

  it("hides by default and reveals on the command-dialog hover group", () => {
    const className = agentHistoryAgentNameClassName("command-item");
    expect(className).toContain("hidden");
    expect(className).toContain("group-hover/command-item:inline");
  });
});
