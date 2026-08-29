import type { AutomationJobStatus, AutomationRunStatus } from "@buildingai/services/web";

const lifecycleLabels: Record<AutomationJobStatus, string> = {
  active: "待执行",
  paused: "已暂停",
  cancelled: "已取消",
  completed: "已完成",
  failed: "失败",
};

export function getAutomationStatusLabel(task: {
  status: AutomationJobStatus;
  lastRunStatus?: AutomationRunStatus;
}): string {
  if (task.status === "active" && task.lastRunStatus === "running") return "运行中";
  return lifecycleLabels[task.status];
}

/** The confirmed delete action is available for every non-completed lifecycle state. */
export function canDeleteAutomationTask(task: { status: AutomationJobStatus }): boolean {
  return task.status !== "completed";
}
