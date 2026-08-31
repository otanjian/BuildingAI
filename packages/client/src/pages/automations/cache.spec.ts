import type { AutomationTask } from "@buildingai/services/web";
import { describe, expect, it } from "vitest";

import { removeAutomationTaskFromList } from "../../../../@buildingai/web/services/src/web/automation-cache";

const task = (id: string): AutomationTask =>
  ({
    id,
    name: id,
    prompt: "Prompt",
    updatedAt: "2030-01-01T00:00:00.000Z",
    agentId: "agent-1",
    scheduleKind: "cron",
    schedule: { kind: "cron", expression: "0 9 * * *", timezone: "UTC" },
    timezone: "UTC",
    channel: "feishu",
    status: "active",
    nextRunAt: "2030-01-02T00:00:00.000Z",
    lastRunAt: null,
    creatorId: "user-1",
    deliveryStatus: "pending",
    deleteAfterRun: false,
    missedRunPolicy: "fire_once",
    overlapPolicy: "skip",
    timeoutSeconds: 900,
  }) as AutomationTask;

describe("automation task cache helpers", () => {
  it("removes a deleted task immediately while preserving other tasks", () => {
    expect(removeAutomationTaskFromList([task("task-1"), task("task-2")], "task-1")).toEqual([
      task("task-2"),
    ]);
  });
});
