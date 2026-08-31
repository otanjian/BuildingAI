import { describe, expect, it } from "vitest";

import {
  canChangeTodoLifecycle,
  canEditTodo,
  isTodoConflict,
  isTodoOverdue,
  validateTodoForm,
} from "./todo-policy";

const todo = { creatorId: "creator", assigneeId: "assignee" };

describe("todo form and action policy", () => {
  it("derives overdue state from an in-progress planned date and calendar-day boundary", () => {
    expect(
      isTodoOverdue({ status: "in_progress", plannedCompletionDate: "2026-08-28" }, "2026-08-29"),
    ).toBe(true);
    expect(
      isTodoOverdue({ status: "in_progress", plannedCompletionDate: "2026-08-29" }, "2026-08-29"),
    ).toBe(false);
    expect(
      isTodoOverdue({ status: "in_progress", plannedCompletionDate: "2026-08-30" }, "2026-08-29"),
    ).toBe(false);
  });

  it("does not mark completed, undated, or invalid records overdue", () => {
    expect(
      isTodoOverdue({ status: "completed", plannedCompletionDate: "2026-08-28" }, "2026-08-29"),
    ).toBe(false);
    expect(
      isTodoOverdue({ status: "in_progress", plannedCompletionDate: null }, "2026-08-29"),
    ).toBe(false);
    expect(
      isTodoOverdue({ status: "in_progress", plannedCompletionDate: "2026-02-30" }, "2026-03-01"),
    ).toBe(false);
  });

  it("keeps definition and deletion controls creator-only", () => {
    expect(canEditTodo(todo, "creator")).toBe(true);
    expect(canEditTodo(todo, "assignee")).toBe(false);
  });

  it("lets the creator or current assignee change lifecycle", () => {
    expect(canChangeTodoLifecycle(todo, "creator")).toBe(true);
    expect(canChangeTodoLifecycle(todo, "assignee")).toBe(true);
    expect(canChangeTodoLifecycle(todo, "former-assignee")).toBe(false);
  });

  it("validates required title, title length, assignee, and date-only planning", () => {
    expect(validateTodoForm({ title: "", assigneeId: "user" })).toContain("标题");
    expect(validateTodoForm({ title: "x".repeat(201), assigneeId: "user" })).toContain("200");
    expect(validateTodoForm({ title: "Todo" })).toContain("责任人");
    expect(
      validateTodoForm({
        title: "Todo",
        assigneeId: "user",
        plannedCompletionDate: "tomorrow",
      }),
    ).toContain("日期");
    expect(
      validateTodoForm({
        title: "Todo",
        assigneeId: "user",
        plannedCompletionDate: "2026-08-31",
      }),
    ).toBeNull();
  });

  it("recognizes stale edit conflicts from domain and HTTP client errors", () => {
    expect(isTodoConflict({ httpStatus: 409 })).toBe(true);
    expect(isTodoConflict({ status: 409 })).toBe(true);
    expect(isTodoConflict({ response: { status: 409 } })).toBe(true);
    expect(isTodoConflict(new Error("other"))).toBe(false);
  });
});
