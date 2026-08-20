import type { QueryOptionsUtil, UserInfo } from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiHttpClient } from "../base";

export function useUserInfoQuery(options?: QueryOptionsUtil<UserInfo>) {
    return useQuery<UserInfo>({
        queryKey: ["user", "info"],
        queryFn: () => apiHttpClient.get<UserInfo>("/user/info"),
        ...options,
    });
}

/**
 * Get all public user configurations (excludes private groups)
 * Used for frontend localStorage cache
 */
export function useUserConfigQuery(
    options?: QueryOptionsUtil<Record<string, Record<string, any>>>,
) {
    return useQuery<Record<string, Record<string, any>>>({
        queryKey: ["user", "config"],
        queryFn: () => apiHttpClient.get<Record<string, Record<string, any>>>("/user/config"),
        ...options,
    });
}

/**
 * Get user configurations by specific group
 * Can access any group including private ones
 */
export function useUserConfigByGroupQuery(
    group: string,
    options?: QueryOptionsUtil<Record<string, any>>,
) {
    return useQuery<Record<string, any>>({
        queryKey: ["user", "config", group],
        queryFn: () => apiHttpClient.get<Record<string, any>>(`/user/config/${group}`),
        ...options,
    });
}

export type UserConfigRecord = {
    id: string;
    key: string;
    value: any;
    group: string;
    description?: string;
    createdAt: string;
};

/**
 * Get user config records (with ids) for a group — used by the
 * personal parameters table for add / edit / delete.
 */
export function useUserConfigRecordsQuery(
    group: string,
    options?: QueryOptionsUtil<UserConfigRecord[]>,
) {
    return useQuery<UserConfigRecord[]>({
        queryKey: ["user", "config", group, "records"],
        queryFn: () => apiHttpClient.get<UserConfigRecord[]>(`/user/config/${group}/records`),
        ...options,
    });
}

export function useSetUserConfigMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (
            data:
                | { key: string; value: any; group?: string }
                | { items: Array<{ key: string; value: any; group?: string }> },
        ) => apiHttpClient.post("/user/config", data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", "config"] });
        },
    });
}

export function useDeleteUserConfigMutation(group: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (key: string) =>
            apiHttpClient.delete(`/user/config/${encodeURIComponent(group)}/${encodeURIComponent(key)}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["user", "config"] });
        },
    });
}
