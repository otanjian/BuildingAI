import { describe, expect, it } from "vitest";

import {
  AGENT_CHAT_CONVERSATIONS_QUERY_KEY,
  shouldCommitConversationRename,
} from "./conversation-rename";

describe("shouldCommitConversationRename", () => {
  it("returns false for empty or whitespace-only titles", () => {
    expect(shouldCommitConversationRename("当前标题", "")).toBe(false);
    expect(shouldCommitConversationRename("当前标题", "   ")).toBe(false);
  });

  it("returns false when trimmed title is unchanged", () => {
    expect(shouldCommitConversationRename("当前的项目结构", "当前的项目结构")).toBe(false);
    expect(shouldCommitConversationRename("当前的项目结构", "  当前的项目结构  ")).toBe(false);
  });

  it("returns true when trimmed title differs", () => {
    expect(shouldCommitConversationRename("? ?", "项目结构说明")).toBe(true);
  });
});

describe("AGENT_CHAT_CONVERSATIONS_QUERY_KEY", () => {
  it("matches the agents chat conversations list prefix", () => {
    expect(AGENT_CHAT_CONVERSATIONS_QUERY_KEY).toEqual(["agents", "chat", "conversations"]);
  });
});
