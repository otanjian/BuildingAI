import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Tenant, TenantMembership } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { isMembershipActive, selectTenantMembership } from "./tenant-context";

/**
 * Resolves the tenant selected by a request.  A client supplied tenant id is
 * only a selector; membership and tenant state remain the authority.
 */
@Injectable()
export class TenantContextService {
    constructor(
        @InjectRepository(Tenant) private readonly tenantRepository: Repository<Tenant>,
        @InjectRepository(TenantMembership) private readonly membershipRepository: Repository<TenantMembership>,
    ) {}

    async listForUser(userId: string, isRoot = false): Promise<Tenant[]> {
        const memberships = await this.membershipRepository.find({
            where: { userId, status: "active" },
            relations: ["tenant"],
            order: { createdAt: "ASC" },
        });
        const active = memberships
            .filter((membership) => membership.tenant && membership.tenant.status === "active" && isMembershipActive(membership))
            .map((membership) => membership.tenant);
        if (isRoot) {
            const tenants = await this.tenantRepository.find({ where: { status: "active" }, order: { name: "ASC" } });
            const byId = new Map(active.map((tenant) => [tenant.id, tenant]));
            for (const tenant of tenants) byId.set(tenant.id, tenant);
            return [...byId.values()].map((tenant) => Object.assign(tenant, {
                isAdministrator: true,
            })) as Tenant[];
        }
        return active.map((tenant) => Object.assign(tenant, {
            isAdministrator: ((tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId) === userId,
        })) as Tenant[];
    }

    async resolve(userId: string, tenantId: string, isRoot = false): Promise<TenantMembership | null> {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant || tenant.status !== "active") throw HttpErrorFactory.notFound("Resource not found");
        if (isRoot) {
            return this.membershipRepository.findOne({ where: { userId, tenantId }, relations: ["tenant"] });
        }
        const membership = await this.membershipRepository.findOne({
            where: { userId, tenantId },
            relations: ["tenant", "project", "organization"],
        });
        if (!membership || !isMembershipActive(membership) || membership.tenant?.status !== "active") {
            throw HttpErrorFactory.notFound("Resource not found");
        }
        return membership;
    }

    async assertAdmin(userId: string, isRoot: boolean, tenantId: string): Promise<Tenant> {
        const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } });
        if (!tenant || tenant.status !== "active") throw HttpErrorFactory.notFound("Tenant not found");
        if (isRoot) return tenant;
        const membership = await this.resolve(userId, tenantId);
        const adminUserId = (tenant as Tenant & { adminUserId?: string | null }).adminUserId ?? tenant.ownerId;
        if (!membership || membership.userId !== adminUserId) throw HttpErrorFactory.notFound("Tenant not found");
        return tenant;
    }

    async select(userId: string, requestedTenantId: string | undefined, isRoot = false): Promise<TenantMembership | null> {
        const tenants = await this.listForUser(userId, isRoot);
        const memberships = await Promise.all(tenants.map((tenant) =>
            this.membershipRepository.findOne({ where: { userId, tenantId: tenant.id }, relations: ["tenant"] }),
        ));
        return selectTenantMembership(memberships.filter(Boolean) as TenantMembership[], requestedTenantId);
    }

    static assertConsistentTenant(pathTenantId?: string, headerTenantId?: string): void {
        if (pathTenantId && headerTenantId && pathTenantId !== headerTenantId) {
            throw HttpErrorFactory.notFound("Resource not found");
        }
    }
}
