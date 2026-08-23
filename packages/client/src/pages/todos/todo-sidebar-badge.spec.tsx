import { describe, expect, it } from "vitest";

import { renderToStaticMarkup } from "react-dom/server";
import { TodoSidebarBadge } from "../../../../@buildingai/web/ui/src/layouts/styles/default/_components/todo-sidebar-badge";

describe("TodoSidebarBadge", () => {
  it("renders loading, empty, ordinary, and capped count states", () => {
    expect(renderToStaticMarkup(<TodoSidebarBadge isLoading />)).toContain("加载中");
    expect(renderToStaticMarkup(<TodoSidebarBadge isLoading={false} count={0} />)).toBe("");
    expect(renderToStaticMarkup(<TodoSidebarBadge isLoading={false} count={8} />)).toContain(">8<");
    expect(renderToStaticMarkup(<TodoSidebarBadge isLoading={false} count={120} />)).toContain("99+");
  });
});
