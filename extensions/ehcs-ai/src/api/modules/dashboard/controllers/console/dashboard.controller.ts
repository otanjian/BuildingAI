import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Get, Query } from "@nestjs/common";

import { DashboardService } from "../../services/dashboard.service";

@ExtensionConsoleController("dashboard", "EHCS Dashboard")
export class DashboardConsoleController extends BaseController {
    constructor(private readonly dashboardService: DashboardService) {
        super();
    }

    @Get("overview")
    overview() {
        return this.dashboardService.overview();
    }

    @Get("summary")
    summary() {
        return this.dashboardService.summary();
    }

    @Get("trend")
    trend(@Query("days") days?: string) {
        const n = days ? Number(days) : 7;
        return this.dashboardService.trend(Number.isFinite(n) ? n : 7);
    }

    @Get("recent-anomalies")
    recent(@Query("limit") limit?: string) {
        const n = limit ? Number(limit) : 5;
        return this.dashboardService.recentAnomalies(Number.isFinite(n) ? n : 5);
    }
}
