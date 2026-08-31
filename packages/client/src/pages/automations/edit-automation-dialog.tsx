import type { AutomationTask } from "@buildingai/services/web";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@buildingai/ui/components/ui/dialog";
import { Input } from "@buildingai/ui/components/ui/input";
import { Label } from "@buildingai/ui/components/ui/label";
import { Switch } from "@buildingai/ui/components/ui/switch";
import { Textarea } from "@buildingai/ui/components/ui/textarea";
import { useEffect, useState } from "react";

import type { AutomationTaskUpdate } from "@buildingai/services/web";

type ScheduleKind = AutomationTask["scheduleKind"];

type EditAutomationValues = {
  name: string;
  prompt: string;
  scheduleKind: ScheduleKind;
  at: string;
  intervalSeconds: string;
  anchorAt: string;
  expression: string;
  timezone: string;
  deleteAfterRun: boolean;
  missedRunPolicy: AutomationTask["missedRunPolicy"];
  overlapPolicy: AutomationTask["overlapPolicy"];
  timeoutSeconds: string;
};

export type EditAutomationDialogProps = {
  task: AutomationTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: Omit<AutomationTaskUpdate, "id">) => void;
  isPending?: boolean;
};

function toDateTimeInput(value: unknown): string {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeInput(value: string): string {
  return new Date(value).toISOString();
}

function valuesFromTask(task: AutomationTask): EditAutomationValues {
  const schedule = task.schedule;
  return {
    name: task.name,
    prompt: task.prompt,
    scheduleKind: task.scheduleKind,
    at: toDateTimeInput(schedule.at),
    intervalSeconds: String(schedule.intervalSeconds ?? 3600),
    anchorAt: toDateTimeInput(schedule.anchorAt),
    expression: String(schedule.expression ?? "0 9 * * *"),
    timezone: String(schedule.timezone ?? task.timezone ?? "UTC"),
    deleteAfterRun: task.deleteAfterRun,
    missedRunPolicy: task.missedRunPolicy,
    overlapPolicy: task.overlapPolicy,
    timeoutSeconds: String(task.timeoutSeconds),
  };
}

export function EditAutomationDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isPending = false,
}: EditAutomationDialogProps) {
  const [values, setValues] = useState<EditAutomationValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && task) {
      setValues(valuesFromTask(task));
      setError(null);
    }
  }, [open, task]);

  if (!task || !values) return null;

  const setValue = <K extends keyof EditAutomationValues>(
    key: K,
    value: EditAutomationValues[K],
  ) => {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setError(null);
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = values.name.trim();
    const prompt = values.prompt.trim();
    if (!name) return setError("任务名称不能为空");
    if (!prompt) return setError("提示词不能为空");

    let schedule: AutomationTaskUpdate["schedule"];
    try {
      if (values.scheduleKind === "at") {
        if (!values.at) throw new Error("请选择执行时间");
        schedule = { kind: "at", at: fromDateTimeInput(values.at) };
      } else if (values.scheduleKind === "every") {
        const intervalSeconds = Number(values.intervalSeconds);
        if (!Number.isInteger(intervalSeconds) || intervalSeconds < 60) {
          throw new Error("周期至少为 60 秒");
        }
        if (!values.anchorAt) throw new Error("请选择周期锚点");
        schedule = {
          kind: "every",
          intervalSeconds,
          anchorAt: fromDateTimeInput(values.anchorAt),
          ...(values.timezone.trim() ? { timezone: values.timezone.trim() } : {}),
        };
      } else {
        if (!values.expression.trim()) throw new Error("Cron 表达式不能为空");
        if (!values.timezone.trim()) throw new Error("时区不能为空");
        schedule = {
          kind: "cron",
          expression: values.expression.trim(),
          timezone: values.timezone.trim(),
        };
      }
      const timeoutSeconds = Number(values.timeoutSeconds);
      if (!Number.isInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 86_400) {
        throw new Error("超时时间必须在 1 到 86400 秒之间");
      }
      onSave({
        name,
        prompt,
        schedule,
        deleteAfterRun: values.deleteAfterRun,
        missedRunPolicy: values.missedRunPolicy,
        overlapPolicy: values.overlapPolicy,
        timeoutSeconds,
        expectedUpdatedAt: task.updatedAt,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "请检查任务配置");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>编辑定时任务</DialogTitle>
          <DialogDescription>
            修改任务定义后，下一次执行时间会根据新的调度重新计算。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="automation-name">任务名称</Label>
            <Input
              id="automation-name"
              value={values.name}
              onChange={(event) => setValue("name", event.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="automation-prompt">提示词</Label>
            <Textarea
              id="automation-prompt"
              value={values.prompt}
              onChange={(event) => setValue("prompt", event.target.value)}
              maxLength={12_000}
              rows={5}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="automation-schedule-kind">调度类型</Label>
              <select
                id="automation-schedule-kind"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={values.scheduleKind}
                onChange={(event) => setValue("scheduleKind", event.target.value as ScheduleKind)}
              >
                <option value="at">一次性</option>
                <option value="every">周期</option>
                <option value="cron">Cron</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-timezone">时区</Label>
              <Input
                id="automation-timezone"
                value={values.timezone}
                onChange={(event) => setValue("timezone", event.target.value)}
                placeholder="Asia/Shanghai"
              />
            </div>
          </div>
          {values.scheduleKind === "at" && (
            <div className="space-y-2">
              <Label htmlFor="automation-at">执行时间</Label>
              <Input
                id="automation-at"
                type="datetime-local"
                value={values.at}
                onChange={(event) => setValue("at", event.target.value)}
              />
            </div>
          )}
          {values.scheduleKind === "every" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="automation-interval">间隔秒数</Label>
                <Input
                  id="automation-interval"
                  type="number"
                  min={60}
                  step={1}
                  value={values.intervalSeconds}
                  onChange={(event) => setValue("intervalSeconds", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="automation-anchor">周期锚点</Label>
                <Input
                  id="automation-anchor"
                  type="datetime-local"
                  value={values.anchorAt}
                  onChange={(event) => setValue("anchorAt", event.target.value)}
                />
              </div>
            </div>
          )}
          {values.scheduleKind === "cron" && (
            <div className="space-y-2">
              <Label htmlFor="automation-expression">Cron 表达式</Label>
              <Input
                id="automation-expression"
                value={values.expression}
                onChange={(event) => setValue("expression", event.target.value)}
                placeholder="0 9 * * *"
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="automation-missed-policy">错过执行</Label>
              <select
                id="automation-missed-policy"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={values.missedRunPolicy}
                onChange={(event) =>
                  setValue(
                    "missedRunPolicy",
                    event.target.value as EditAutomationValues["missedRunPolicy"],
                  )
                }
              >
                <option value="fire_once">立即执行一次</option>
                <option value="skip">跳过</option>
                <option value="catch_up">补偿执行</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-overlap-policy">重叠执行</Label>
              <select
                id="automation-overlap-policy"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={values.overlapPolicy}
                onChange={(event) =>
                  setValue(
                    "overlapPolicy",
                    event.target.value as EditAutomationValues["overlapPolicy"],
                  )
                }
              >
                <option value="skip">跳过</option>
                <option value="queue_one">排队一次</option>
                <option value="allow">允许并行</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="automation-timeout">超时秒数</Label>
              <Input
                id="automation-timeout"
                type="number"
                min={1}
                max={86_400}
                step={1}
                value={values.timeoutSeconds}
                onChange={(event) => setValue("timeoutSeconds", event.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="automation-delete-after-run">执行后删除任务</Label>
            <Switch
              id="automation-delete-after-run"
              checked={values.deleteAfterRun}
              onCheckedChange={(checked) => setValue("deleteAfterRun", checked)}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "保存中…" : "保存修改"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
