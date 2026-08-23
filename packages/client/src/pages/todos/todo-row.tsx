import type { PersonalTodo } from "@buildingai/services/web";
import { Badge } from "@buildingai/ui/components/ui/badge";
import { Progress } from "@buildingai/ui/components/ui/progress";
import { CalendarDays, CheckCircle2, UserRound } from "lucide-react";

function formatDate(value: string | null) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
}

function formatDateTime(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TodoRow({ todo, actions }: { todo: PersonalTodo; actions?: React.ReactNode }) {
  return (
    <article className="group grid gap-5 rounded-2xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:grid-cols-[minmax(0,1.5fr)_minmax(220px,0.7fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant={todo.status === "completed" ? "secondary" : "default"}>
            {todo.status === "completed" ? "已完成" : "进行中"}
          </Badge>
          <h2 className="truncate text-base font-semibold" title={todo.title}>
            {todo.title}
          </h2>
        </div>
        {todo.description ? (
          <p className="text-muted-foreground line-clamp-2 text-sm leading-6">{todo.description}</p>
        ) : (
          <p className="text-muted-foreground/70 text-sm">暂无描述</p>
        )}
        <div className="text-muted-foreground mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <UserRound className="size-3.5" /> 创建者：{todo.creator.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            <UserRound className="size-3.5" /> 责任人：{todo.assignee.displayName}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> 计划：{formatDate(todo.plannedCompletionDate)}
          </span>
          {todo.completedAt ? (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> 完成：{formatDateTime(todo.completedAt)}
            </span>
          ) : null}
        </div>
      </div>

      <div aria-label={`当前进度 ${todo.progress}%`}>
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">当前进度</span>
          <span className="font-medium tabular-nums">{todo.progress}%</span>
        </div>
        <Progress value={todo.progress} className="h-2" />
      </div>

      {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </article>
  );
}
