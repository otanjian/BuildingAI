import { describe, expect, it } from "vitest";

import type { PersonalTodo } from "@buildingai/services/web";
import { renderToStaticMarkup } from "react-dom/server";

import { TodoRow } from "./todo-row";

const baseTodo: PersonalTodo = {
  id: "todo-1",
  title: "发布新版本",
  description: "完成发布前检查",
  creatorId: "user-1",
  assigneeId: "user-2",
  plannedCompletionDate: "2026-08-31",
  progress: 60,
  status: "in_progress",
  completedAt: null,
  createdAt: "2026-08-20T08:00:00.000Z",
  updatedAt: "2026-08-22T08:00:00.000Z",
  creator: { id: "user-1", displayName: "创建人", avatar: null },
  assignee: { id: "user-2", displayName: "责任人", avatar: null },
};

describe("TodoRow", () => {
  it("renders the compact accountability, planning, and progress fields", () => {
    const html = renderToStaticMarkup(<TodoRow todo={baseTodo} />);
    expect(html).toContain("创建者：创建人");
    expect(html).toContain("责任人：责任人");
    expect(html).toContain("计划：");
    expect(html).toContain("60%");
    expect(html).not.toContain("完成：");
  });

  it("shows actual completion time only for completed records", () => {
    const html = renderToStaticMarkup(
      <TodoRow
        todo={{
          ...baseTodo,
          status: "completed",
          progress: 100,
          completedAt: "2026-08-22T08:00:00.000Z",
        }}
      />,
    );
    expect(html).toContain("完成：");
    expect(html).toContain("100%");
  });
});
