import type {
    MutationOptionsUtil,
    PaginatedQueryOptionsUtil,
    PaginatedResponse,
    QueryOptionsUtil,
} from "@buildingai/web-types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { consoleHttpClient } from "../base";

export type Tenant = {
    id: string;
    name: string;
    code: string;
    status: string;
    policyVersion?: number;
    adminUserId?: string | null;
    ownerId?: string | null;
    isAdministrator?: boolean;
    memberCount?: number;
    openingDate?: string | null;
    createdAt?: string | null;
};

export type TenantListParams = {
    keyword?: string;
    status?: "active" | "suspended" | "pending" | "archived" | string;
    page?: number;
    pageSize?: number;
};

export type TenantListResponse = PaginatedResponse<Tenant>;

export type CreateTenantInput = {
    name: string;
    code: string;
    adminUserId?: string;
    username?: string;
    password?: string;
    email?: string;
    nickname?: string;
    realName?: string;
    phone?: string;
    avatar?: string;
};
export type TenantProject = { id: string; name: string; code: string; status: string };
export type TenantMember = {
    id: string;
    roleCode: "admin" | "member" | string;
    status: string;
    invitationEmail: string | null;
    expiresAt: string | null;
    isAdministrator?: boolean;
    user?: { id: string; username: string; nickname?: string | null; email?: string | null } | null;
    project?: TenantProject | null;
    organization?: { id: string; name: string } | null;
};

export type TenantGrant = {
    id: string;
    projectId: string;
    resourceType: string;
    resourceId: string;
    subjectId: string;
    actions: string[];
};

const tenantKey = ["tenant-admin"] as const;

export function useTenantsQuery(options?: QueryOptionsUtil<Tenant[]>) {
    return useQuery({
        queryKey: tenantKey,
        queryFn: async () => {
            const response = await consoleHttpClient.get<Tenant[] | TenantListResponse>("/tenant", {
                params: { page: 1, pageSize: 100 },
            });
            return Array.isArray(response) ? response : response.items;
        },
        ...options,
    });
}

/** Tenant lifecycle list used by the platform administration page. */
export function useTenantListQuery(
    params: TenantListParams = {},
    options?: PaginatedQueryOptionsUtil<Tenant>,
) {
    return useQuery<TenantListResponse>({
        queryKey: [...tenantKey, "list", params],
        queryFn: () =>
            consoleHttpClient.get<TenantListResponse>("/tenant", {
                params: {
                    ...params,
                    ...(params.keyword?.trim() ? { keyword: params.keyword.trim() } : {}),
                },
            }),
        ...options,
    });
}

export function useCreateTenantMutation(options?: MutationOptionsUtil<Tenant, CreateTenantInput>) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (body) => consoleHttpClient.post<Tenant>("/tenant", body),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: tenantKey });
            void queryClient.invalidateQueries({ queryKey: ["users", "list"] });
            options?.onSuccess?.(...args);
        },
    });
}

export function useUpdateTenantStatusMutation(
    options?: MutationOptionsUtil<Tenant, { tenantId: string; status: "active" | "suspended" }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, status }) =>
            consoleHttpClient.patch<Tenant>(`/tenant/${tenantId}/status`, { status }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: tenantKey });
            options?.onSuccess?.(...args);
        },
    });
}

export function useArchiveTenantMutation(options?: MutationOptionsUtil<Tenant, string>) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: (tenantId) => consoleHttpClient.delete<Tenant>(`/tenant/${tenantId}`),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: tenantKey });
            options?.onSuccess?.(...args);
        },
    });
}

export function useTenantMembersQuery(
    tenantId: string,
    options?: QueryOptionsUtil<TenantMember[]>,
) {
    return useQuery({
        queryKey: [...tenantKey, "members", tenantId],
        queryFn: () => consoleHttpClient.get<TenantMember[]>(`/tenant/${tenantId}/members`),
        enabled: Boolean(tenantId),
        ...options,
    });
}

export function useTenantProjectsQuery(
    tenantId: string,
    options?: QueryOptionsUtil<TenantProject[]>,
) {
    return useQuery({
        queryKey: [...tenantKey, "projects", tenantId],
        queryFn: () => consoleHttpClient.get<TenantProject[]>(`/tenant/${tenantId}/projects`),
        enabled: Boolean(tenantId),
        ...options,
    });
}

export type InviteTenantMemberInput = {
    tenantId: string;
    invitationEmail?: string;
    email?: string;
    username?: string;
    userId?: string;
    password?: string;
    roleCode?: "admin" | "member" | string;
};

export function useInviteTenantMemberMutation(
    options?: MutationOptionsUtil<TenantMember, InviteTenantMemberInput>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, ...body }) =>
            consoleHttpClient.post<TenantMember>(`/tenant/${tenantId}/members`, body),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "members"] });
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "list"] });
            options?.onSuccess?.(...args);
        },
    });
}

/** Create a global account and its membership in one tenant-scoped operation. */
export type CreateTenantUserInput = {
    tenantId: string;
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    realName?: string;
    roleCode?: "admin" | "member" | string;
};

export function useCreateTenantUserMutation(
    options?: MutationOptionsUtil<TenantMember, CreateTenantUserInput>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, ...body }) =>
            consoleHttpClient.post<TenantMember>(`/tenant/${tenantId}/members`, {
                ...body,
                roleCode: body.roleCode ?? "member",
            }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "members"] });
            void queryClient.invalidateQueries({ queryKey: ["users", "list"] });
            options?.onSuccess?.(...args);
        },
    });
}

export function useSetTenantAdministratorMutation(
    options?: MutationOptionsUtil<Tenant, { tenantId: string; userId: string }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, userId }) =>
            consoleHttpClient.patch<Tenant>(`/tenant/${tenantId}/administrator`, { userId }),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: tenantKey });
            options?.onSuccess?.(...args);
        },
    });
}

export function useCreateTenantProjectMutation(
    options?: MutationOptionsUtil<TenantProject, { tenantId: string; name: string; code: string }>,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, ...body }) =>
            consoleHttpClient.post<TenantProject>(`/tenant/${tenantId}/projects`, body),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "projects"] });
            options?.onSuccess?.(...args);
        },
    });
}

export function useUpdateTenantMemberMutation(
    options?: MutationOptionsUtil<
        TenantMember,
        {
            tenantId: string;
            membershipId: string;
            roleCode?: string;
            status?: string;
            projectId?: string | null;
        }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, membershipId, ...body }) =>
            consoleHttpClient.patch<TenantMember>(
                `/tenant/${tenantId}/members/${membershipId}`,
                body,
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "members"] });
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "list"] });
            options?.onSuccess?.(...args);
        },
    });
}

export function useDeleteTenantMemberMutation(
    options?: MutationOptionsUtil<
        { success: boolean } | TenantMember,
        { tenantId: string; membershipId: string }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, membershipId }) =>
            consoleHttpClient.delete<{ success: boolean } | TenantMember>(
                `/tenant/${tenantId}/members/${membershipId}`,
            ),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "members"] });
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "list"] });
            options?.onSuccess?.(...args);
        },
    });
}

export function useCreateTenantGrantMutation(
    options?: MutationOptionsUtil<
        TenantGrant,
        {
            tenantId: string;
            projectId: string;
            resourceType: string;
            resourceId: string;
            subjectId: string;
            actions: string[];
        }
    >,
) {
    const queryClient = useQueryClient();
    return useMutation({
        ...options,
        mutationFn: ({ tenantId, ...body }) =>
            consoleHttpClient.post<TenantGrant>(`/tenant/${tenantId}/grants`, body),
        onSuccess: (...args) => {
            void queryClient.invalidateQueries({ queryKey: [...tenantKey, "grants"] });
            options?.onSuccess?.(...args);
        },
    });
}
