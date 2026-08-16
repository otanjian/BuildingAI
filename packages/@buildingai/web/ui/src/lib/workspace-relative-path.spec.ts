import { describe, expect, it } from "vitest";

import { normalizeWorkspaceRelativePath } from "./workspace-relative-path";

describe("normalizeWorkspaceRelativePath", () => {
  it("returns . for empty or root", () => {
    expect(normalizeWorkspaceRelativePath("")).toBe(".");
    expect(normalizeWorkspaceRelativePath(".")).toBe(".");
    expect(normalizeWorkspaceRelativePath("/")).toBe(".");
  });

  it("strips leading ./ and trailing slashes", () => {
    expect(normalizeWorkspaceRelativePath("./packages/api/")).toBe("packages/api");
    expect(normalizeWorkspaceRelativePath("AGENTS.md")).toBe("AGENTS.md");
  });
});
