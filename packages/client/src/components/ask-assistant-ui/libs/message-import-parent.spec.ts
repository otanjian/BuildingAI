import { describe, expect, it } from "vitest";

import { resolveImportParentId } from "./message-import-parent";

describe("resolveImportParentId", () => {
  it("keeps a parent that already exists in the repository", () => {
    expect(
      resolveImportParentId({
        role: "assistant",
        requestedParentId: "u2",
        knownIds: new Set(["u1", "a1", "u2"]),
        lastUserId: "u2",
        recordSequence: 3,
        headSequence: 2,
      }),
    ).toBe("u2");
  });

  it("attaches a newer assistant to the last user when the parent id is unknown", () => {
    expect(
      resolveImportParentId({
        role: "assistant",
        requestedParentId: "client-user-id",
        knownIds: new Set(["u1", "a1", "u2"]),
        lastUserId: "u2",
        recordSequence: 3,
        headSequence: 2,
      }),
    ).toBe("u2");
  });

  it("does not rewrite older paged messages whose parent is simply not loaded yet", () => {
    expect(
      resolveImportParentId({
        role: "assistant",
        requestedParentId: "older-user",
        knownIds: new Set(["u1", "a1"]),
        lastUserId: "u1",
        recordSequence: 0,
        headSequence: 5,
      }),
    ).toBe("older-user");
  });

  it("leaves explicit roots unchanged", () => {
    expect(
      resolveImportParentId({
        role: "user",
        requestedParentId: null,
        knownIds: new Set(),
        lastUserId: null,
        recordSequence: 0,
        headSequence: null,
      }),
    ).toBeNull();
  });
});
