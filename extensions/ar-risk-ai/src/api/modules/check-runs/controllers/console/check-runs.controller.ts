import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Body, Get, Param, ParseIntPipe, Post } from "@nestjs/common";

import { IngestRuleDto } from "../../dto/ingest-rule.dto";
import { CheckRunsService } from "../../services/check-runs.service";

@ExtensionConsoleController("check-runs", "ARR Check Runs")
export class CheckRunsConsoleController extends BaseController {
    constructor(private readonly checkRunsService: CheckRunsService) {
        super();
    }

    @Post()
    start() {
        return this.checkRunsService.start();
    }

    @Get(":runId")
    get(@Param("runId", ParseIntPipe) runId: number) {
        return this.checkRunsService.get(runId);
    }

    @Post(":runId/cancel")
    cancel(@Param("runId", ParseIntPipe) runId: number) {
        return this.checkRunsService.cancel(runId);
    }

    @Post(":runId/items/:ruleId/ingest")
    ingest(
        @Param("runId", ParseIntPipe) runId: number,
        @Param("ruleId") ruleId: string,
        @Body() dto: IngestRuleDto,
    ) {
        return this.checkRunsService.ingest(runId, ruleId, dto);
    }
}
