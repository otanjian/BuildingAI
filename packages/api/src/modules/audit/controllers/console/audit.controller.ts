import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AuditEvent, CostLedger } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { ConsoleController } from "@common/decorators";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Query } from "@nestjs/common";

import { ObservabilityDashboardService } from "../../services/observability-dashboard";

@ConsoleController("audit", "审计与成本治理")
export class AuditConsoleController {
    constructor(
        @InjectRepository(AuditEvent) private readonly events: Repository<AuditEvent>,
        @InjectRepository(CostLedger) private readonly ledger: Repository<CostLedger>,
        private readonly dashboard: ObservabilityDashboardService,
    ) {}

    @Get("dashboard")
    @Permissions({ code: "dashboard", name: "查看审计与成本概览" })
    async dashboardView(@Query("tenantId") tenantId?: string, @Query("page") page = "1", @Query("pageSize") pageSize = "20", @Query("keyword") keyword?: string) {
        const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
        const currentPage = Math.max(Number(page) || 1, 1);
        const where = tenantId ? { tenantId } : {};
        const events = await this.events.find({ where: where as any, order: { createdAt: "DESC" }, take: 500 });
        const filtered = keyword ? events.filter((event) => `${event.action} ${event.outcome} ${event.requestId}`.toLowerCase().includes(keyword.toLowerCase())) : events;
        const ledger = await this.ledger.find({ where: where as any, order: { createdAt: "DESC" }, take: 500 });
        const totalCost = ledger.reduce((sum, entry) => sum + Number(entry.settledAmount || 0), 0);
        const start = (currentPage - 1) * limit;
        return {
            summary: this.dashboard.summarize(filtered),
            cost: { settled: Number(totalCost.toFixed(8)), reserved: ledger.reduce((sum, entry) => sum + Number(entry.reservedAmount || 0), 0) },
            page: currentPage,
            pageSize: limit,
            total: filtered.length,
            items: filtered.slice(start, start + limit).map((event) => this.dashboard.toExportRow(event)),
            export: { format: "csv", redacted: true, endpoint: "/console/audit/export" },
        };
    }

    @Get("export")
    @Permissions({ code: "export", name: "导出脱敏审计" })
    async export(@Query("tenantId") tenantId?: string) {
        const events = await this.events.find({ where: (tenantId ? { tenantId } : {}) as any, order: { createdAt: "DESC" }, take: 5000 });
        return { format: "json", redacted: true, generatedAt: new Date().toISOString(), items: events.map((event) => this.dashboard.toExportRow(event)) };
    }
}
