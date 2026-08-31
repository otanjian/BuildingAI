import { HttpErrorFactory } from "@buildingai/errors";
import type { SelectQueryBuilder } from "typeorm";

export interface TenantScopeContext {
    tenantId?: string;
    projectId?: string;
}

/** Service-layer guardrail shared by repositories and non-HTTP workers. */
export class TenantScopeService {
    requireTenant(context: TenantScopeContext): string {
        if (!context.tenantId) {
            throw HttpErrorFactory.badRequest("Select an active tenant before using this resource", undefined, 40031);
        }
        return context.tenantId;
    }

    assertTenant(resourceTenantId: string | null | undefined, context: TenantScopeContext): void {
        const tenantId = this.requireTenant(context);
        if (!resourceTenantId || resourceTenantId !== tenantId) {
            throw HttpErrorFactory.notFound("Resource not found");
        }
    }

    apply<T>(query: SelectQueryBuilder<T>, alias: string, context: TenantScopeContext): SelectQueryBuilder<T> {
        const tenantId = this.requireTenant(context);
        query.andWhere(`${alias}.tenant_id = :tenantScopeId`, { tenantScopeId: tenantId });
        if (context.projectId) {
            query.andWhere(`(${alias}.project_id IS NULL OR ${alias}.project_id = :projectScopeId)`, {
                projectScopeId: context.projectId,
            });
        }
        return query;
    }
}
