import type { TodoListParams, TodoTab } from "@buildingai/services/web";

const FILTER_KEYS = [
  "keyword",
  "creatorId",
  "assigneeId",
  "plannedDateFrom",
  "plannedDateTo",
  "progressMin",
  "progressMax",
] as const;

export function readTodoSearchParams(search: URLSearchParams): TodoListParams {
  const numberOrUndefined = (key: string) => {
    const value = search.get(key);
    return value === null || value === "" || Number.isNaN(Number(value)) ? undefined : Number(value);
  };
  const tab = search.get("tab");
  return {
    tab: tab === "completed" || tab === "all" ? tab : "in_progress",
    keyword: search.get("keyword") || undefined,
    creatorId: search.get("creatorId") || undefined,
    assigneeId: search.get("assigneeId") || undefined,
    plannedDateFrom: search.get("plannedDateFrom") || undefined,
    plannedDateTo: search.get("plannedDateTo") || undefined,
    progressMin: numberOrUndefined("progressMin"),
    progressMax: numberOrUndefined("progressMax"),
    page: Math.max(numberOrUndefined("page") ?? 1, 1),
    pageSize: 15,
  };
}

export function updateTodoSearchParams(
  current: URLSearchParams,
  patch: Partial<TodoListParams>,
  resetPage: boolean = true,
) {
  const next = new URLSearchParams(current);
  Object.entries(patch).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  });
  if (resetPage) next.delete("page");
  return next;
}

export function clearTodoFilters(current: URLSearchParams) {
  const next = new URLSearchParams(current);
  FILTER_KEYS.forEach((key) => next.delete(key));
  next.delete("page");
  return next;
}

export function validateTodoFilterRanges(params: TodoListParams): string | null {
  if (
    params.plannedDateFrom &&
    params.plannedDateTo &&
    params.plannedDateFrom > params.plannedDateTo
  ) {
    return "计划开始日期不能晚于结束日期";
  }
  if (
    params.progressMin !== undefined &&
    params.progressMax !== undefined &&
    params.progressMin > params.progressMax
  ) {
    return "最低进度不能大于最高进度";
  }
  return null;
}

export function tabLabel(tab: TodoTab) {
  return tab === "in_progress" ? "进行中" : tab === "completed" ? "已经完成" : "全部";
}
