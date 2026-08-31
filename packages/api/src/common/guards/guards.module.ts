import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Agent, User, Tenant, TenantMembership, Organization, Project, TenantRole, ResourceGrant, TenantAuditEvent } from "@buildingai/db/entities";
import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ExtensionGuard } from "./extension.guard";

@Module({
    imports: [TypeOrmModule.forFeature([Agent, User, Tenant, TenantMembership, Organization, Project, TenantRole, ResourceGrant, TenantAuditEvent])],
    providers: [Reflector],
    exports: [Reflector, TypeOrmModule],
})
export class GuardsModule {}
