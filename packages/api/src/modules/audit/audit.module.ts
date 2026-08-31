import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AuditEvent, AuditOutbox, BudgetPolicy, CostLedger, UsageEvent } from "@buildingai/db/entities";
import { Global, Module } from "@nestjs/common";
import { AuditGovernanceService } from "./services/audit-governance.service";
import { ObservabilityAdapters } from "./services/observability-adapters";
import { BudgetPolicyService } from "./services/budget-policy.service";
import { ObservabilityDashboardService } from "./services/observability-dashboard";
import { AuditConsoleController } from "./controllers/console/audit.controller";

@Global()
@Module({
    imports: [TypeOrmModule.forFeature([AuditEvent, AuditOutbox, BudgetPolicy, CostLedger, UsageEvent])],
    providers: [AuditGovernanceService, ObservabilityAdapters, BudgetPolicyService, ObservabilityDashboardService],
    controllers: [AuditConsoleController],
    exports: [AuditGovernanceService, ObservabilityAdapters, BudgetPolicyService, ObservabilityDashboardService],
})
export class AuditModule {}
