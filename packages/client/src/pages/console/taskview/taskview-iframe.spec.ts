import { describe, expect, it } from "vitest";

import { buildTaskviewIframeSrc, getTaskviewRoutePath, TASKVIEW_TABS } from "./taskview-iframe";

const ORG_SLUG = "org-c5e8042a";
const BASE_URL = "https://ai.bosofts.com/taskview-web";
const TOKEN = "taskview-access-token";
const REFRESH = "taskview-refresh-token";

describe("buildTaskviewIframeSrc", () => {
  it("preserves the base URL path prefix", () => {
    const src = buildTaskviewIframeSrc(BASE_URL, ORG_SLUG, TOKEN);
    expect(src).toContain("https://ai.bosofts.com/taskview-web/org-c5e8042a/default");
  });

  it("passes the access token via the _t param (base64)", () => {
    const src = buildTaskviewIframeSrc(BASE_URL, ORG_SLUG, TOKEN);
    const url = new URL(src);
    expect(url.searchParams.get("_t")).toBe(btoa(TOKEN));
  });

  it("passes the refresh token via the _r param when provided", () => {
    const src = buildTaskviewIframeSrc(BASE_URL, ORG_SLUG, TOKEN, REFRESH);
    const url = new URL(src);
    expect(url.searchParams.get("_r")).toBe(btoa(REFRESH));
  });

  it("omits the _r param when no refresh token is available", () => {
    const src = buildTaskviewIframeSrc(BASE_URL, ORG_SLUG, TOKEN);
    const url = new URL(src);
    expect(url.searchParams.has("_r")).toBe(false);
  });

  it("works with a bare-origin base URL (local dev)", () => {
    const src = buildTaskviewIframeSrc("http://localhost:5174", ORG_SLUG, TOKEN);
    expect(src).toContain("http://localhost:5174/org-c5e8042a/default");
  });

  it("supports an explicit view path", () => {
    const src = buildTaskviewIframeSrc(
      BASE_URL,
      ORG_SLUG,
      TOKEN,
      undefined,
      "/org-c5e8042a/default/kanban",
    );
    expect(src).toContain("https://ai.bosofts.com/taskview-web/org-c5e8042a/default/kanban");
  });
});

describe("getTaskviewRoutePath", () => {
  it("maps a known view to its Taskview route", () => {
    expect(getTaskviewRoutePath("kanban", ORG_SLUG)).toBe("/org-c5e8042a/default/kanban");
  });

  it("defaults to tasks for unknown views", () => {
    expect(getTaskviewRoutePath("nope", ORG_SLUG)).toBe("/org-c5e8042a/default");
  });

  it("resolves org-level views without projectId", () => {
    expect(getTaskviewRoutePath("settings", ORG_SLUG)).toBe("/org-c5e8042a/settings");
  });
});

describe("TASKVIEW_TABS", () => {
  it("hides admin/settings tabs from the top bar", () => {
    const visible = TASKVIEW_TABS.map((t) => t.viewName);
    expect(visible).not.toContain("account");
    expect(visible).not.toContain("settings");
    expect(visible).not.toContain("integrations");
    expect(visible).not.toContain("webhooks");
    expect(visible).not.toContain("messaging");
  });

  it("keeps the core work views", () => {
    const visible = TASKVIEW_TABS.map((t) => t.viewName);
    expect(visible).toContain("tasks");
    expect(visible).toContain("kanban");
    expect(visible).toContain("graph");
    expect(visible).toContain("sprints");
    expect(visible).toContain("collaboration");
  });

  it("has unique viewNames", () => {
    const names = TASKVIEW_TABS.map((t) => t.viewName);
    expect(new Set(names).size).toBe(names.length);
  });
});
