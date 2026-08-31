import type { AutomationTask } from "../console/automations";

export function removeAutomationTaskFromList(
    tasks: AutomationTask[],
    id: string,
): AutomationTask[] {
    return tasks.filter((task) => task.id !== id);
}
