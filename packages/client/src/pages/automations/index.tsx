import { useDocumentHead } from "@buildingai/hooks";
import {
  type AutomationJobStatus,
  type AutomationTask,
  useAutomationTaskMutation,
  useAutomationTasksQuery,
  useDeleteAutomationTaskMutation,
  useRunAutomationTaskMutation,
} from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@buildingai/ui/components/ui/empty";
import { Skeleton } from "@buildingai/ui/components/ui/skeleton";
import { useAlertDialog } from "@buildingai/ui/hooks/use-alert-dialog";
import { CalendarClock, Play, RefreshCw, RotateCcw, Square, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

import { canDeleteAutomationTask, getAutomationStatusLabel } from "./status";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN");
}

function formatSchedule(task: AutomationTask): string {
  if (task.scheduleKind === "at") return `一次性 · ${formatDate(String(task.schedule.at ?? ""))}`;
  if (task.scheduleKind === "every") {
    const seconds = Number(task.schedule.intervalSeconds);
    const interval = Number.isFinite(seconds)
      ? seconds % 3_600 === 0
        ? `${seconds / 3_600} 小时`
        : seconds % 60 === 0
          ? `${seconds / 60} 分钟`
          : `${seconds} 秒`
      : "周期";
    return `每 ${interval}`;
  }
  return `Cron ${String(task.schedule.expression ?? "")} · ${task.timezone}`;
}

function statusVariant(status: AutomationJobStatus): "secondary" | "destructive" | "outline" {
  if (status === "failed") return "destructive";
  if (status === "active" || status === "completed") return "secondary";
  return "outline";
}

function TaskCard({ task }: { task: AutomationTask }) {
  const { confirm } = useAlertDialog();
  const lifecycle = useAutomationTaskMutation({
    onSuccess: () => toast.success("任务状态已更新"),
    onError: (error) => toast.error(`操作失败：${error.message}`),
  });
  const remove = useDeleteAutomationTaskMutation({
    onSuccess: () => toast.success("任务已删除"),
    onError: (error) => toast.error(`删除失败：${error.message}`),
  });
  const run = useRunAutomationTaskMutation({
    onSuccess: () => toast.success("任务已加入执行队列"),
    onError: (error) => toast.error(`执行失败：${error.message}`),
  });

  const action = useMemo(() => {
    if (task.status === "active") {
      return { label: "暂停", icon: <Square className="size-3.5" />, operation: "pause" as const };
    }
    if (task.status === "paused") {
      return { label: "恢复", icon: <Play className="size-3.5" />, operation: "resume" as const };
    }
    return null;
  }, [task.status]);

  const handleDelete = async () => {
    try {
      await confirm({
        title: "确认删除任务？",
        description: `删除“${task.name}”后将停止后续执行，但运行记录仍会保留。`,
        confirmText: "删除",
        confirmVariant: "destructive",
      });
      await remove.mutateAsync({ id: task.id, expectedUpdatedAt: task.updatedAt });
    } catch {
      // The confirmation dialog was cancelled or the request failed.
    }
  };

  return (
    <article className="bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="text-primary size-4 shrink-0" />
            <h2 className="truncate font-semibold">{task.name}</h2>
            <Badge variant={statusVariant(task.status)}>{getAutomationStatusLabel(task)}</Badge>
          </div>
          <p className="text-muted-foreground mt-2 text-sm">{formatSchedule(task)}</p>
          <dl className="text-muted-foreground mt-3 grid gap-1 text-xs sm:grid-cols-2">
            <div>
              <dt className="inline">下次执行：</dt>
              <dd className="text-foreground ml-1 inline">{formatDate(task.nextRunAt)}</dd>
            </div>
            <div>
              <dt className="inline">上次执行：</dt>
              <dd className="text-foreground ml-1 inline">{formatDate(task.lastRunAt)}</dd>
            </div>
            <div>
              <dt className="inline">渠道：</dt>
              <dd className="text-foreground ml-1 inline">{task.channel}</dd>
            </div>
            <div>
              <dt className="inline">投递：</dt>
              <dd className="text-foreground ml-1 inline">
                {task.deliveryStatus === "delivered" ? "已送达" : task.deliveryStatus}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action && (
            <Button
              size="sm"
              variant="outline"
              disabled={lifecycle.isPending}
              onClick={() =>
                lifecycle.mutate({
                  id: task.id,
                  operation: action.operation,
                  expectedUpdatedAt: task.updatedAt,
                })
              }
            >
              {action.icon}
              {action.label}
            </Button>
          )}
          {!["cancelled", "completed"].includes(task.status) && (
            <Button
              size="sm"
              variant="outline"
              disabled={run.isPending}
              onClick={() => run.mutate({ id: task.id, idempotencyKey: crypto.randomUUID() })}
            >
              <RotateCcw className="size-3.5" />
              立即执行
            </Button>
          )}
          {canDeleteAutomationTask(task) && (
            <Button
              size="sm"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-3.5" />
              删除
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function AutomationsPage() {
  useDocumentHead({ title: "定时任务" });
  const query = useAutomationTasksQuery({ refetchInterval: 15_000 });

  return (
    <div className="relative min-h-full overflow-auto bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_28rem)]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 pb-12 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary mb-2 text-xs font-semibold tracking-[0.2em] uppercase">
              Automation workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">定时任务</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              管理智能体的定时执行计划，结果会发送到任务所属的渠道。
            </p>
          </div>
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={query.isFetching ? "animate-spin" : ""} />
            刷新
          </Button>
        </header>

        {query.isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-2xl" />
            ))}
          </div>
        ) : query.isError ? (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyTitle>加载定时任务失败</EmptyTitle>
              <EmptyDescription>请检查网络后重试。</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => query.refetch()}>
              重新加载
            </Button>
          </Empty>
        ) : query.data?.length ? (
          <section className="grid gap-3">
            {query.data.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </section>
        ) : (
          <Empty className="min-h-72 border">
            <EmptyHeader>
              <EmptyTitle>还没有定时任务</EmptyTitle>
              <EmptyDescription>在已连接的飞书会话中发送 /schedule 创建任务。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </main>
    </div>
  );
}
