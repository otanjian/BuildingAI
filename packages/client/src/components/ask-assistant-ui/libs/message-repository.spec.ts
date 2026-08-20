import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";

import { MessageRepository, type RawMessageRecord } from "./message-repository";

function msg(id: string, role: UIMessage["role"], text: string): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }],
  };
}

function record(
  id: string,
  role: UIMessage["role"],
  parentId: string | null,
  sequence: number,
  text = id,
): RawMessageRecord {
  return { id, parentId, sequence, message: msg(id, role, text) };
}

describe("MessageRepository live-turn import", () => {
  it("keeps history and the user turn when a live assistant parent id is missing", () => {
    const repo = new MessageRepository();
    repo.import([
      record("u1", "user", null, 0, "hello"),
      record("a1", "assistant", "u1", 1, "hi"),
      record("u2", "user", "a1", 2, "clean junk files"),
    ]);

    repo.importIncremental([
      record("u1", "user", null, 0, "hello"),
      record("a1", "assistant", "u1", 1, "hi"),
      record("u2", "user", "a1", 2, "clean junk files"),
      record("live-asst", "assistant", "client-user-id", 3, "starting cleanup"),
    ]);

    const displayed = repo.getDisplayMessages();
    expect(displayed.map((d) => d.id)).toEqual(["u1", "a1", "u2", "live-asst"]);
    expect(displayed[3]?.parentId).toBe("u2");
    expect(displayed[3]?.branchCount).toBe(1);
  });

  it("does not promote a missing-parent assistant into a second root branch", () => {
    const repo = new MessageRepository();
    repo.import([
      record("u1", "user", null, 0, "hello"),
      record("a1", "assistant", "u1", 1, "hi"),
    ]);

    repo.importIncremental([record("live-asst", "assistant", "missing-parent", 2, "working")]);

    const displayed = repo.getDisplayMessages();
    expect(displayed.map((d) => d.id)).toContain("u1");
    expect(displayed[0]?.id).toBe("u1");
    expect(repo.getParentId("live-asst")).toBe("u1");
    expect(repo.getBranchInfo("u1")?.branchCount).toBe(1);
  });
});
