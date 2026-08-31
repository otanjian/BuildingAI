import type { PersonalTodo } from "@buildingai/services/web";

export interface TodoFormValues {
  title: string;
  assigneeId?: string;
  plannedCompletionDate?: string | null;
}

type TodoSchedule = Pick<PersonalTodo, "status" | "plannedCompletionDate">;

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function formatDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTodoOverdue(todo: TodoSchedule, today = formatDateOnly(new Date())) {
  return (
    todo.status === "in_progress" &&
    typeof todo.plannedCompletionDate === "string" &&
    isValidDateOnly(todo.plannedCompletionDate) &&
    isValidDateOnly(today) &&
    todo.plannedCompletionDate < today
  );
}

export function canEditTodo(todo: Pick<PersonalTodo, "creatorId">, currentUserId?: string) {
  return Boolean(currentUserId && todo.creatorId === currentUserId);
}

export function canChangeTodoLifecycle(
  todo: Pick<PersonalTodo, "creatorId" | "assigneeId">,
  currentUserId?: string,
) {
  return Boolean(
    currentUserId && (todo.creatorId === currentUserId || todo.assigneeId === currentUserId),
  );
}

export function validateTodoForm(values: TodoFormValues): string | null {
  const title = values.title.trim();
  if (!title) return "请输入待办标题";
  if (title.length > 200) return "待办标题不能超过 200 个字符";
  if (!values.assigneeId) return "请选择责任人";
  if (values.plannedCompletionDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.plannedCompletionDate)) {
    return "计划完成日期格式无效";
  }
  return null;
}

export function isTodoConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    httpStatus?: number;
    status?: number;
    response?: { status?: number; data?: { data?: { reason?: string } } };
  };
  return (
    candidate.httpStatus === 409 ||
    candidate.status === 409 ||
    candidate.response?.status === 409 ||
    candidate.response?.data?.data?.reason === "stale_update"
  );
}
