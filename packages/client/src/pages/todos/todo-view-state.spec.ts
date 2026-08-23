import { describe, expect, it } from "vitest";

import {
  clearTodoFilters,
  readTodoSearchParams,
  updateTodoSearchParams,
  validateTodoFilterRanges,
} from "./todo-view-state";

describe("todo URL view state", () => {
  it("defaults to in-progress and the first page", () => {
    expect(readTodoSearchParams(new URLSearchParams())).toMatchObject({
      tab: "in_progress",
      page: 1,
    });
  });

  it("resets pagination when tabs or filters change", () => {
    const initial = new URLSearchParams("tab=all&page=4&keyword=old");
    expect(updateTodoSearchParams(initial, { tab: "completed" }).toString()).toBe(
      "tab=completed&keyword=old",
    );
  });

  it("clears filters while preserving the selected tab", () => {
    const initial = new URLSearchParams("tab=completed&page=3&keyword=launch&progressMin=20");
    expect(clearTodoFilters(initial).toString()).toBe("tab=completed");
  });

  it("prevents inverted planned-date and progress ranges", () => {
    expect(
      validateTodoFilterRanges({
        plannedDateFrom: "2026-09-01",
        plannedDateTo: "2026-08-01",
      }),
    ).toContain("日期");
    expect(validateTodoFilterRanges({ progressMin: 80, progressMax: 20 })).toContain("进度");
    expect(validateTodoFilterRanges({ progressMin: 20, progressMax: 80 })).toBeNull();
  });
});
