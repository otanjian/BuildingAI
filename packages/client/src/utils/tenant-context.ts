import type { QueryClient, QueryKey } from "@tanstack/react-query";

export type TenantSelection = {
  id: string;
  status?: string | null;
};

/** Pick only an active tenant that is present in the server-provided list. */
export function resolveTenantSelection(
  tenants: TenantSelection[],
  activeTenantId?: string,
  defaultTenantId?: string,
): string | undefined {
  const active = tenants.find(
    (tenant) => tenant.id === activeTenantId && (!tenant.status || tenant.status === "active"),
  );
  if (active) return active.id;

  const fallback = tenants.find(
    (tenant) => tenant.id === defaultTenantId && (!tenant.status || tenant.status === "active"),
  );
  if (fallback) return fallback.id;

  return tenants.find((tenant) => !tenant.status || tenant.status === "active")?.id;
}

/**
 * Remove cached records whose contents are tenant-scoped before a context switch.
 * The API remains the source of truth; this prevents stale records from flashing
 * while the new tenant queries are loading.
 */
export function clearTenantScopedQueryCache(queryClient: QueryClient): void {
  const prefixes = new Set([
    "tenant-admin",
    "users",
    "agents",
    "datasets",
    "mcp-servers",
    "automation",
    "credentials",
    "audit",
    "tool-gateway",
    "chat",
  ]);
  queryClient.removeQueries({
    predicate: ({ queryKey }: { queryKey: QueryKey }) => {
      const first = queryKey[0];
      return typeof first === "string" && prefixes.has(first);
    },
  });
}
