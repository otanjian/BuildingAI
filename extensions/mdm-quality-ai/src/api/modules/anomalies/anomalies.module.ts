import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { CheckResult } from "../../db/entities/check-result.entity";
import { AnomaliesConsoleController } from "./controllers/console/anomalies.controller";
import { AnomaliesService } from "./services/anomalies.service";

@Module({
    imports: [TypeOrmModule.forFeature([CheckResult])],
    controllers: [AnomaliesConsoleController],
    providers: [AnomaliesService],
    exports: [AnomaliesService],
})
export class AnomaliesModule {}
