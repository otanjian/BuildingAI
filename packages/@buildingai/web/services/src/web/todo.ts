import type { MutationOptionsUtil, QueryOptionsUtil } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";
import {
    TODO_ASSIGNEES_QUERY_KEY,
    TODO_COUNT_QUERY_KEY,
    normalizeTodoListParams,
    todoDetailQueryKey,
    todoListQueryKey,
    type TodoListParams,
} from "./todo-contract";
import { invalidateTodoCaches } from "./todo-cache";

export * from "./todo-contract";
export * from "./todo-cache";

export interface TodoUserSummary {
    id: string;
    displayName: string;
    avatar: string | null;
}

export interface TodoAssignee extends TodoUserSummary {
    departments: Array<{ id: string; name: string }>;
}

export interface PersonalTodo {
    id: string;
    title: string;
    description: string | null;
    creatorId: string;
    assigneeId: string;
    plannedCompletionDate: string | null;
    progress: number;
    status: "in_progress" | "completed";
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    creator: TodoUserSummary;
    assignee: TodoUserSummary;
}

export interface PersonalTodoListResponse {
    items: PersonalTodo[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface CreatePersonalTodoInput {
    title: string;
    description?: string | null;
    assigneeId?: string;
    plannedCompletionDate?: string | null;
}

export interface UpdatePersonalTodoInput extends Partial<CreatePersonalTodoInput> {
    id: string;
    expectedUpdatedAt: string;
}

export interface TodoVersionInput {
    id: string;
    expectedUpdatedAt: string;
}

export interface UpdateTodoProgressInput extends TodoVersionInput {
    progress: number;
}

export function usePersonalTodosQuery(
    params: TodoListParams = {},
    options?: QueryOptionsUtil<PersonalTodoListResponse>,
) {
    const normalizedParams = normalizeTodoListParams(params);
    return useQuery<PersonalTodoListResponse>({
        queryKey: todoListQueryKey(normalizedParams),
        queryFn: () =>
            apiHttpClient.get<PersonalTodoListResponse>("/todos", { params: normalizedParams }),
        ...options,
    });
}

export function usePersonalTodoQuery(
    id: string,
    options?: QueryOptionsUtil<PersonalTodo>,
) {
    return useQuery<PersonalTodo>({
        queryKey: todoDetailQueryKey(id),
        queryFn: () => apiHttpClient.get<PersonalTodo>(`/todos/${id}`),
        enabled: Boolean(id) && options?.enabled !== false,
        ...options,
    });
}

export function useTodoAssignedCountQuery(options?: QueryOptionsUtil<{ count: number }>) {
    return useQuery<{ count: number }>({
        queryKey: TODO_COUNT_QUERY_KEY,
        queryFn: () => apiHttpClient.get<{ count: number }>("/todos/count"),
        ...options,
    });
}

export function useTodoAssigneesQuery(
    params: { keyword?: string; limit?: number } = {},
    options?: QueryOptionsUtil<TodoAssignee[]>,
) {
    return useQuery<TodoAssignee[]>({
        queryKey: [...TODO_ASSIGNEES_QUERY_KEY, params],
        queryFn: () => apiHttpClient.get<TodoAssignee[]>("/todos/assignees", { params }),
        ...options,
    });
}

function useTodoMutation<TInput>(
    mutationFn: (input: TInput) => Promise<PersonalTodo | { id: string }>,
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, TInput>,
) {
    const queryClient = useQueryClient();
    return useMutation<PersonalTodo | { id: string }, Error, TInput>({
        ...options,
        mutationFn,
        onSuccess: (...args) => {
            const data = args[0];
            void invalidateTodoCaches(queryClient, "id" in data ? data.id : undefined);
            options?.onSuccess?.(...args);
        },
    });
}

export function useCreatePersonalTodoMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, CreatePersonalTodoInput>,
) {
    return useTodoMutation(
        (body) => apiHttpClient.post<PersonalTodo>("/todos", body),
        options,
    );
}

export function useUpdatePersonalTodoMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, UpdatePersonalTodoInput>,
) {
    return useTodoMutation(({ id, ...body }) => apiHttpClient.patch<PersonalTodo>(`/todos/${id}`, body), options);
}

export function useUpdateTodoProgressMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, UpdateTodoProgressInput>,
) {
    return useTodoMutation(
        ({ id, ...body }) => apiHttpClient.patch<PersonalTodo>(`/todos/${id}/progress`, body),
        options,
    );
}

export function useCompletePersonalTodoMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, TodoVersionInput>,
) {
    return useTodoMutation(
        ({ id, ...body }) => apiHttpClient.post<PersonalTodo>(`/todos/${id}/complete`, body),
        options,
    );
}

export function useReopenPersonalTodoMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, TodoVersionInput>,
) {
    return useTodoMutation(
        ({ id, ...body }) => apiHttpClient.post<PersonalTodo>(`/todos/${id}/reopen`, body),
        options,
    );
}

export function useDeletePersonalTodoMutation(
    options?: MutationOptionsUtil<PersonalTodo | { id: string }, TodoVersionInput>,
) {
    return useTodoMutation(
        ({ id, ...body }) => apiHttpClient.delete<{ id: string }>(`/todos/${id}`, { data: body }),
        options,
    );
}
