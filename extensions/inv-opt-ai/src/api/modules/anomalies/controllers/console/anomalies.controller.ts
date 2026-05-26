import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Body, Get, Param, Patch, Query } from "@nestjs/common";

import { UpdateAnomalyStatusDto } from "../../dto/update-anomaly-status.dto";
import { AnomaliesService } from "../../services/anomalies.service";

@ExtensionConsoleController("anomalies", "INVO Anomalies")
export class AnomaliesConsoleController extends BaseController {
    constructor(private readonly anomaliesService: AnomaliesService) {
        super();
    }

    @Get()
    list(@Query("risk") risk?: string, @Query("status") status?: string) {
        return this.anomaliesService.list({ risk, status });
    }

    @Get(":anomalyId")
    get(@Param("anomalyId") anomalyId: string) {
        return this.anomaliesService.getByAnomalyId(anomalyId);
    }

    @Patch(":anomalyId/status")
    updateStatus(@Param("anomalyId") anomalyId: string, @Body() dto: UpdateAnomalyStatusDto) {
        return this.anomaliesService.updateStatus(anomalyId, dto);
    }
}
