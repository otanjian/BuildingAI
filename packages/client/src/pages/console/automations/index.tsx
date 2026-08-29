import { useDocumentHead } from "@buildingai/hooks";
import {
  type AutomationDispatch,
  type AutomationDispatchStatus,
  type AutomationRun,
  type AutomationRunStatus,
  type AutomationTask,
  useAutomationDispatchesQuery,
  useAutomationDispatchRecoveryMutation,
  useAutomationRunsQuery,
  useAutomationStatusQuery,
  useAutomationTasksQuery,
} from "@buildingai/services/console";
import { PermissionGuard } from "@buildingai/ui/components/auth/permission-guard";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Button } from "@buildingai/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@buildingai/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@buildingai/ui/components/ui/table";
import { Activity, AlertTriangle, CheckCircle2, Clock3, RefreshCw, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/layouts/console/_components/page-container";

import { getAutomationStatusLabel } from "../../automations/status";

type View = "tasks" | "runs" | "dispatches";

const runStatusLabels: Record<AutomationRunStatus, string> = {
  pending: "待处理",
  queued: "已入队",
  running: "执行中",
  succeeded: "成功",
  failed: "失败",
  timed_out: "超时",
  cancelled: "已取消",
  unknown: "未知",
  skipped: "已跳过",
};

const dispatchStatusLabels: Record<AutomationDispatchStatus, string> = {
  pending: "待投递",
  leased: "已租约",
  sent: "已发送",
  failed: "失败",
  unknown: "未知",
  dismissed: "已忽略",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN");
}

function formatSchedule(task: AutomationTask): string {
  const schedule = task.schedule;
  if (task.scheduleKind === "at") return `一次性 · ${formatDate(String(schedule.at ?? ""))}`;
  if (task.scheduleKind === "every") {
    const seconds = Number(schedule.intervalSeconds);
    const interval = Number.isFinite(seconds)
      ? seconds % 3_600 === 0
        ? `${seconds / 3_600} 小时`
        : seconds % 60 === 0
          ? `${seconds / 60} 分钟`
          : `${seconds} 秒`
      : "周期";
    return `每 ${interval} · 锚点 ${formatDate(String(schedule.anchorAt ?? ""))}`;
  }
  return `Cron ${String(schedule.expression ?? "")} · ${task.timezone}`;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["failed", "timed_out", "unknown"].includes(status)) return "destructive";
  if (["succeeded", "sent", "active", "delivered"].includes(status)) return "secondary";
  return "outline";
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground h-24 text-center">
        {label}
      </TableCell>
    </TableRow>
  );
}

function TaskTable({ tasks, loading }: { tasks: AutomationTask[]; loading: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>任务</TableHead>
          <TableHead>调度</TableHead>
          <TableHead>下次执行</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>最近运行</TableHead>
          <TableHead>投递</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <EmptyRow colSpan={6} label="加载中…" />}
        {!loading && tasks.length === 0 && <EmptyRow colSpan={6} label="暂无定时任务" />}
        {!loading &&
          tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <div className="font-medium">{task.name}</div>
                <div className="text-muted-foreground font-mono text-xs">{task.id}</div>
              </TableCell>
              <TableCell className="max-w-[300px] text-sm whitespace-normal">
                {formatSchedule(task)}
              </TableCell>
              <TableCell className="text-sm">{formatDate(task.nextRunAt)}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(task.status)}>{getAutomationStatusLabel(task)}</Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">{formatDate(task.lastRunAt)}</div>
                {task.lastRunStatus && (
                  <Badge variant={statusVariant(task.lastRunStatus)}>
                    {runStatusLabels[task.lastRunStatus]}
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(task.deliveryStatus)}>
                  {task.deliveryStatus === "delivered"
                    ? "已送达"
                    : task.deliveryStatus === "pending"
                      ? "待投递"
                      : task.deliveryStatus === "dismissed"
                        ? "已忽略"
                        : task.deliveryStatus === "unknown"
                          ? "未知"
                          : "失败"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function RunTable({ runs, loading }: { runs: AutomationRun[]; loading: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>运行时间</TableHead>
          <TableHead>任务 / Occurrence</TableHead>
          <TableHead>触发方式</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>尝试次数</TableHead>
          <TableHead>投递</TableHead>
          <TableHead>结果 / 错误摘要</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <EmptyRow colSpan={7} label="加载中…" />}
        {!loading && runs.length === 0 && <EmptyRow colSpan={7} label="暂无运行记录" />}
        {!loading &&
          runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="text-sm">{formatDate(run.scheduledAt)}</TableCell>
              <TableCell>
                <div className="font-mono text-xs">{run.jobId}</div>
                <div className="text-muted-foreground max-w-[180px] truncate font-mono text-xs">
                  {run.occurrenceKey}
                </div>
              </TableCell>
              <TableCell>
                {run.trigger === "manual" ? "手动" : run.trigger === "catch_up" ? "补偿" : "计划"}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(run.status)}>{runStatusLabels[run.status]}</Badge>
              </TableCell>
              <TableCell>{run.attempt}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(run.deliveryStatus)}>
                  {run.deliveryStatus === "delivered" ? "已送达" : run.deliveryStatus}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[280px] text-xs whitespace-normal">
                {run.errorPreview || run.resultPreview || "—"}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

function DispatchTable({
  dispatches,
  loading,
  onRecover,
  pending,
}: {
  dispatches: AutomationDispatch[];
  loading: boolean;
  onRecover: (dispatch: AutomationDispatch, action: "retry" | "dismiss") => void;
  pending: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>创建时间</TableHead>
          <TableHead>类型</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>尝试</TableHead>
          <TableHead>下次尝试</TableHead>
          <TableHead>错误</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && <EmptyRow colSpan={7} label="加载中…" />}
        {!loading && dispatches.length === 0 && <EmptyRow colSpan={7} label="暂无投递记录" />}
        {!loading &&
          dispatches.map((dispatch) => (
            <TableRow key={dispatch.id}>
              <TableCell className="text-sm">{formatDate(dispatch.createdAt)}</TableCell>
              <TableCell>{dispatch.kind}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(dispatch.status)}>
                  {dispatchStatusLabels[dispatch.status]}
                </Badge>
              </TableCell>
              <TableCell>{dispatch.attempts}</TableCell>
              <TableCell className="text-sm">{formatDate(dispatch.nextAttemptAt)}</TableCell>
              <TableCell className="max-w-[260px] truncate text-xs">
                {dispatch.lastError || "—"}
              </TableCell>
              <TableCell>
                {dispatch.status !== "sent" && dispatch.status !== "dismissed" && (
                  <div className="flex items-center gap-1">
                    <PermissionGuard permissions="automations:recover">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onRecover(dispatch, "retry")}
                      >
                        <RotateCcw className="size-3" />
                        重试
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onRecover(dispatch, "dismiss")}
                      >
                        忽略
                      </Button>
                    </PermissionGuard>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
      </TableBody>
    </Table>
  );
}

export default function AutomationsPage() {
  useDocumentHead({ title: "定时任务" });
  const [view, setView] = useState<View>("tasks");
  const [jobId, setJobId] = useState<string>();
  const status = useAutomationStatusQuery({ refetchInterval: 15_000 });
  const tasks = useAutomationTasksQuery({ refetchInterval: 15_000 });
  const runs = useAutomationRunsQuery(jobId);
  const dispatches = useAutomationDispatchesQuery();
  const recovery = useAutomationDispatchRecoveryMutation({
    onSuccess: () => toast.success("投递状态已更新"),
    onError: (error) => toast.error(`操作失败：${error.message}`),
  });
  const taskItems = tasks.data ?? [];
  const selectedTask = useMemo(
    () => taskItems.find((item) => item.id === jobId),
    [jobId, taskItems],
  );

  const refresh = () => {
    void status.refetch();
    void tasks.refetch();
    void runs.refetch();
    void dispatches.refetch();
  };

  const handleRecover = (dispatch: AutomationDispatch, action: "retry" | "dismiss") => {
    recovery.mutate({ id: dispatch.id, action });
  };

  return (
    <PageContainer className="md:h-inset mx-0">
      <div className="flex h-full flex-col gap-5 px-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">定时任务</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              查看智能体计划、运行结果和渠道投递状态。任务创建与日常管理请在所属渠道中完成。
            </p>
          </div>
          <Button
            variant="outline"
            onClick={refresh}
            disabled={status.isFetching || tasks.isFetching}
          >
            <RefreshCw className={status.isFetching || tasks.isFetching ? "animate-spin" : ""} />
            刷新
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card size="sm">
            <CardHeader className="px-4">
              <CardDescription>调度器</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="size-4" />
                {status.data?.schedulerActive ? "运行中" : "未运行"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader className="px-4">
              <CardDescription>活跃任务</CardDescription>
              <CardTitle className="text-lg">{status.data?.activeJobs ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader className="px-4">
              <CardDescription>待投递</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock3 className="size-4" />
                {status.data?.pendingDispatches ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm">
            <CardHeader className="px-4">
              <CardDescription>未知投递</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="size-4" />
                {status.data?.unknownDispatches ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card size="sm" className="col-span-2 md:col-span-1">
            <CardHeader className="px-4">
              <CardDescription>最旧延迟</CardDescription>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="size-4" />
                {status.data ? `${status.data.oldestDueLagSeconds}s` : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["tasks", "runs", "dispatches"] as const).map((item) => (
            <Button
              key={item}
              variant={view === item ? "default" : "outline"}
              onClick={() => setView(item)}
            >
              {item === "tasks" ? "任务列表" : item === "runs" ? "运行记录" : "投递记录"}
            </Button>
          ))}
          {view === "runs" && (
            <select
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={jobId ?? ""}
              onChange={(event) => setJobId(event.target.value || undefined)}
              aria-label="筛选任务"
            >
              <option value="">全部任务</option>
              {taskItems.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          )}
          {selectedTask && (
            <span className="text-muted-foreground text-sm">当前：{selectedTask.name}</span>
          )}
        </div>

        <Card className="min-h-0 flex-1 overflow-hidden py-0">
          <CardContent className="h-full overflow-auto p-0">
            {view === "tasks" && <TaskTable tasks={taskItems} loading={tasks.isLoading} />}
            {view === "runs" && <RunTable runs={runs.data ?? []} loading={runs.isLoading} />}
            {view === "dispatches" && (
              <DispatchTable
                dispatches={dispatches.data ?? []}
                loading={dispatches.isLoading}
                onRecover={handleRecover}
                pending={recovery.isPending}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
