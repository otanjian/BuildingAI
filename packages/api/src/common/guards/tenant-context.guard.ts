import { getOverrideMetadata } from "@buildingai/utils";
import { HttpErrorFactory } from "@buildingai/errors";
import { DECORATOR_KEYS } from "@common/constants/decorators-key.constant";
import { getRequestAuthContext, setRequestAuthContext } from "@common/types/request-auth-context";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import { TenantContextService } from "@modules/tenant/services/tenant-context.service";
import { TENANT_REQUIRED_KEY } from "../decorators/tenant-required.decorator";

@Injectable()
export class TenantContextGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly tenantContextService: TenantContextService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const required = getOverrideMetadata<boolean>(this.reflector, TENANT_REQUIRED_KEY, context);
        const user = request["user"];
        if (!user) return !required;

        const auth = getRequestAuthContext(request);
        const headerTenantId = this.readTenantId(request);
        const pathTenantId = this.readPathTenantId(request);
        TenantContextService.assertConsistentTenant(pathTenantId, headerTenantId);
        const requestedTenantId = headerTenantId ?? pathTenantId;
        if (auth?.agentId) {
            // AgentGuard resolved the public credential. The service will resolve its tenant
            // when the agent is loaded; never accept a tenant header for public requests.
            if (requestedTenantId) {
                throw HttpErrorFactory.notFound("Resource not found");
            }
            if (required && !auth.tenantId) throw HttpErrorFactory.badRequest("Select an active tenant before using this resource", undefined, 40031);
            if (auth.tenantId) this.applyUserTenantContext(user, auth.tenantId, auth.projectId, auth.roleCode, auth.policyVersion);
            return true;
        }

        const tenants = await this.tenantContextService.listForUser(user.id, Boolean(user.isRoot));
        const selected = await this.tenantContextService.select(user.id, requestedTenantId, Boolean(user.isRoot));

        if (requestedTenantId && !selected && user.isRoot) {
            const rootTenant = tenants.find((tenant) => tenant.id === requestedTenantId);
            if (rootTenant) {
                const contextValue = getRequestAuthContext(request);
                setRequestAuthContext(request, {
                    source: contextValue?.source ?? "login",
                    tenantId: rootTenant.id,
                    roleCode: "owner",
                    policyVersion: rootTenant.policyVersion,
                });
                this.applyUserTenantContext(user, rootTenant.id, undefined, "owner", rootTenant.policyVersion);
            }
        }
        if (requestedTenantId && !selected && !user.isRoot) {
            // Avoid disclosing whether the requested tenant exists.
            throw HttpErrorFactory.notFound("Resource not found");
        }
        if (selected) {
            const selectedTenant = selected.tenant;
            const configuredAdminId = selectedTenant
                ? ((selectedTenant as any).adminUserId ?? selectedTenant.ownerId)
                : undefined;
            const effectiveRoleCode = selected.userId && selected.userId === configuredAdminId
                ? "admin"
                : selected.roleCode;
            const contextValue = getRequestAuthContext(request);
            setRequestAuthContext(request, {
                source: contextValue?.source ?? "login",
                tenantId: selected.tenantId,
                projectId: selected.projectId ?? undefined,
                membershipId: selected.id,
                roleCode: effectiveRoleCode,
                policyVersion: selectedTenant?.policyVersion,
            });
            this.applyUserTenantContext(
                user,
                selected.tenantId,
                selected.projectId ?? undefined,
                effectiveRoleCode,
                selectedTenant?.policyVersion,
            );
        }
        if (required && !getRequestAuthContext(request)?.tenantId) {
            throw HttpErrorFactory.badRequest("Select an active tenant before using this resource", undefined, 40031);
        }
        return true;
    }

    private readTenantId(request: Request): string | undefined {
        const value = request.headers["x-tenant-id"];
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private readPathTenantId(request: Request): string | undefined {
        const value = request.params?.tenantId;
        return typeof value === "string" && value.trim() ? value.trim() : undefined;
    }

    private applyUserTenantContext(
        user: Record<string, unknown>,
        tenantId: string,
        projectId?: string,
        roleCode?: string,
        policyVersion?: number,
    ): void {
        user.tenantId = tenantId;
        if (projectId) user.projectId = projectId;
        if (roleCode) user.tenantRoleCode = roleCode;
        if (policyVersion !== undefined) user.tenantPolicyVersion = policyVersion;
    }
}
