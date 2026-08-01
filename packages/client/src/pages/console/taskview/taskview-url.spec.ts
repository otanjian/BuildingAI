import { describe, expect, it } from "vitest";

import { resolveTaskviewUrl } from "./taskview-url";

describe("resolveTaskviewUrl", () => {
  it("keeps the base path prefix when the base URL has one (production)", () => {
    const url = resolveTaskviewUrl("https://ai.bosofts.com/taskview-web", "/org-c5e8042a/default");
    expect(url).toBe("https://ai.bosofts.com/taskview-web/org-c5e8042a/default");
  });

  it("handles a base URL that already ends with a slash", () => {
    const url = resolveTaskviewUrl("https://ai.bosofts.com/taskview-web/", "/org-c5e8042a/default");
    expect(url).toBe("https://ai.bosofts.com/taskview-web/org-c5e8042a/default");
  });

  it("works for a bare origin base URL (local dev)", () => {
    const url = resolveTaskviewUrl("http://localhost:5174", "/org-c5e8042a/default");
    expect(url).toBe("http://localhost:5174/org-c5e8042a/default");
  });

  it("preserves nested route paths", () => {
    const url = resolveTaskviewUrl(
      "https://ai.bosofts.com/taskview-web",
      "/org-c5e8042a/default/kanban",
    );
    expect(url).toBe("https://ai.bosofts.com/taskview-web/org-c5e8042a/default/kanban");
  });

  it("does not drop the base path for non-prefixed routes", () => {
    const url = resolveTaskviewUrl("https://ai.bosofts.com/taskview-web", "/org-c5e8042a/settings");
    expect(url).toBe("https://ai.bosofts.com/taskview-web/org-c5e8042a/settings");
  });
});
