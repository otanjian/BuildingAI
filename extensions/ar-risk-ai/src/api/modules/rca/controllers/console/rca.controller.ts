import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Param, Post } from "@nestjs/common";

import { RcaService } from "../../services/rca.service";

@ExtensionConsoleController("rca", "ARR RCA")
export class RcaConsoleController extends BaseController {
    constructor(private readonly rcaService: RcaService) {
        super();
    }

    @Post("anomalies/:anomalyId/sessions")
    createSession(@Param("anomalyId") anomalyId: string) {
        return this.rcaService.createSession(anomalyId);
    }
}
