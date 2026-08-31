import type { TenantMembership } from "@buildingai/db/entities";

export function isMembershipActive(
    membership: Pick<TenantMembership, "status" | "expiresAt">,
    now = new Date(),
): boolean {
    if (membership.status !== "active") return false;
    return !membership.expiresAt || membership.expiresAt.getTime() > now.getTime();
}

export function selectTenantMembership(
    memberships: TenantMembership[],
    requestedTenantId?: string,
    now = new Date(),
): TenantMembership | null {
    const active = memberships.filter((membership) => isMembershipActive(membership, now));
    if (requestedTenantId) {
        return active.find((membership) => membership.tenantId === requestedTenantId) ?? null;
    }
    return active.length === 1 ? active[0] : null;
}
