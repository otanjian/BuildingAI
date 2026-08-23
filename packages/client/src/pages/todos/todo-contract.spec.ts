import { describe, expect, it } from "vitest";

import {
  normalizeTodoListParams,
  TODO_ASSIGNEES_QUERY_KEY,
  TODO_COUNT_QUERY_KEY,
  todoDetailQueryKey,
  todoListQueryKey,
} from "../../../../@buildingai/web/services/src/web/todo-contract";

describe("todo request and cache contracts", () => {
  it("normalizes tab, filters, and page values into stable query keys", () => {
    const normalized = normalizeTodoListParams({
      tab: undefined,
      keyword: "  launch  ",
      creatorId: "",
      page: 0,
      pageSize: 0,
      progressMin: 0,
      progressMax: 100,
    });

    expect(normalized).toEqual({
      tab: "in_progress",
      keyword: "launch",
      page: 1,
      pageSize: 15,
      progressMin: 0,
      progressMax: 100,
    });
    expect(todoListQueryKey(normalized)).toEqual(["todos", "list", normalized]);
  });

  it("keeps list, detail, directory, and assigned-count cache scopes distinct", () => {
    expect(todoDetailQueryKey("todo-1")).toEqual(["todos", "detail", "todo-1"]);
    expect(TODO_COUNT_QUERY_KEY).toEqual(["todos", "assigned-in-progress-count"]);
    expect(TODO_ASSIGNEES_QUERY_KEY).toEqual(["todos", "assignees"]);
  });
});
