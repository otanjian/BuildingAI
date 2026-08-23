export type TodoTab = "in_progress" | "completed" | "all";

export interface TodoListParams {
    tab?: TodoTab;
    keyword?: string;
    creatorId?: string;
    assigneeId?: string;
    plannedDateFrom?: string;
    plannedDateTo?: string;
    progressMin?: number;
    progressMax?: number;
    page?: number;
    pageSize?: number;
}

export const TODO_LIST_QUERY_KEY = ["todos", "list"] as const;
export const TODO_COUNT_QUERY_KEY = ["todos", "assigned-in-progress-count"] as const;
export const TODO_ASSIGNEES_QUERY_KEY = ["todos", "assignees"] as const;

export function normalizeTodoListParams(params: TodoListParams = {}): Required<
    Pick<TodoListParams, "tab" | "page" | "pageSize">
> &
    Omit<TodoListParams, "tab" | "page" | "pageSize"> {
    const compact = Object.fromEntries(
        Object.entries({
            ...params,
            tab: params.tab ?? "in_progress",
            page: params.page && params.page > 0 ? params.page : 1,
            pageSize: params.pageSize && params.pageSize > 0 ? params.pageSize : 15,
            keyword: params.keyword?.trim(),
        }).filter(([, value]) => value !== "" && value !== undefined && value !== null),
    );
    return compact as ReturnType<typeof normalizeTodoListParams>;
}

export function todoListQueryKey(params: TodoListParams = {}) {
    return [...TODO_LIST_QUERY_KEY, normalizeTodoListParams(params)] as const;
}

export function todoDetailQueryKey(id: string) {
    return ["todos", "detail", id] as const;
}
