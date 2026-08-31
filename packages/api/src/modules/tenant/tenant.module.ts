import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    EnterpriseDataPolicy,
    EnterpriseIdentityDomain,
    EnterpriseIdentityProvider,
    EnterpriseDirectoryMapping,
    EnterpriseScimCursor,
    EnterpriseSyncEvent,
    EnterpriseMfaPolicy,
    EnterpriseStepUpProof,
    EnterpriseRetentionPolicy,
    EnterpriseLegalHold,
    EnterpriseDataSubjectRequest,
    EnterpriseGovernanceJob,
    EnterpriseCompletionManifest,
    Organization,
    Project,
    ResourceGrant,
    Tenant,
    TenantAuditEvent,
    TenantMembership,
    TenantRole,
    User,
} from "@buildingai/db/entities";
import { Module } from "@nestjs/common";

import { TenantConsoleController } from "./controllers/console/tenant.controller";
import { TenantService } from "./services/tenant.service";
import { TenantContextService } from "./services/tenant-context.service";
import { TenantMigrationService } from "./services/tenant-migration.service";
import { TenantScopeService } from "./services/tenant-scope.service";
import { EnterpriseIamPolicyService } from "./services/enterprise-iam-policy.service";
import { EnterpriseScimService } from "./services/enterprise-scim.service";
import { EnterpriseGovernanceService } from "./services/enterprise-governance.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Tenant,
            Organization,
            Project,
            TenantRole,
            TenantMembership,
            ResourceGrant,
            TenantAuditEvent,
            User,
            EnterpriseIdentityProvider,
            EnterpriseIdentityDomain,
            EnterpriseDirectoryMapping,
            EnterpriseScimCursor,
            EnterpriseSyncEvent,
            EnterpriseMfaPolicy,
            EnterpriseStepUpProof,
            EnterpriseDataPolicy,
            EnterpriseRetentionPolicy,
            EnterpriseLegalHold,
            EnterpriseDataSubjectRequest,
            EnterpriseGovernanceJob,
            EnterpriseCompletionManifest,
        ]),
    ],
    controllers: [TenantConsoleController],
    providers: [
        TenantService,
        TenantContextService,
        TenantMigrationService,
        TenantScopeService,
        EnterpriseIamPolicyService,
        EnterpriseScimService,
        EnterpriseGovernanceService,
    ],
    exports: [
        TenantService,
        TenantContextService,
        TenantMigrationService,
        TenantScopeService,
        EnterpriseIamPolicyService,
        EnterpriseScimService,
        EnterpriseGovernanceService,
    ],
})
export class TenantModule {}
