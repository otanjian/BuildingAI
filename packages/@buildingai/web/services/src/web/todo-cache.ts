import type { QueryClient } from "@tanstack/react-query";

import {
    TODO_COUNT_QUERY_KEY,
    TODO_LIST_QUERY_KEY,
    todoDetailQueryKey,
} from "./todo-contract";

export function invalidateTodoCaches(queryClient: QueryClient, todoId?: string) {
    const pending = [
        queryClient.invalidateQueries({ queryKey: TODO_LIST_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: TODO_COUNT_QUERY_KEY }),
    ];
    if (todoId) {
        pending.push(queryClient.invalidateQueries({ queryKey: todoDetailQueryKey(todoId) }));
    }
    return Promise.all(pending);
}
