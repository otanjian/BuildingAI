import { describe, expect, it } from "vitest";

import { canDeleteAutomationTask, getAutomationStatusLabel } from "./status";

describe("getAutomationStatusLabel", () => {
  it("labels an active task waiting for its next occurrence as 待执行", () => {
    expect(getAutomationStatusLabel({ status: "active" })).toBe("待执行");
    expect(getAutomationStatusLabel({ status: "active", lastRunStatus: "succeeded" })).toBe(
      "待执行",
    );
    expect(getAutomationStatusLabel({ status: "active", lastRunStatus: "pending" })).toBe("待执行");
    expect(getAutomationStatusLabel({ status: "active", lastRunStatus: "queued" })).toBe("待执行");
  });

  it("labels a task with a currently executing run as 运行中", () => {
    expect(getAutomationStatusLabel({ status: "active", lastRunStatus: "running" })).toBe("运行中");
  });

  it("keeps non-active lifecycle states explicit", () => {
    expect(getAutomationStatusLabel({ status: "paused" })).toBe("已暂停");
    expect(getAutomationStatusLabel({ status: "cancelled" })).toBe("已取消");
    expect(getAutomationStatusLabel({ status: "completed" })).toBe("已完成");
    expect(getAutomationStatusLabel({ status: "failed" })).toBe("失败");
  });
});

describe("canDeleteAutomationTask", () => {
  it("keeps deletion available for cancelled tasks", () => {
    expect(canDeleteAutomationTask({ status: "cancelled" })).toBe(true);
    expect(canDeleteAutomationTask({ status: "active" })).toBe(true);
    expect(canDeleteAutomationTask({ status: "paused" })).toBe(true);
    expect(canDeleteAutomationTask({ status: "failed" })).toBe(true);
    expect(canDeleteAutomationTask({ status: "completed" })).toBe(false);
  });
});
