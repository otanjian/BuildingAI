import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { CheckRunItem } from "../../db/entities/check-run-item.entity";
import { CheckRun } from "../../db/entities/check-run.entity";
import { RcaSession } from "../../db/entities/rca-session.entity";
import { AnomaliesModule } from "../anomalies/anomalies.module";
import { RulesModule } from "../rules/rules.module";
import { DashboardConsoleController } from "./controllers/console/dashboard.controller";
import { DashboardService } from "./services/dashboard.service";

@Module({
    imports: [
        RulesModule,
        AnomaliesModule,
        TypeOrmModule.forFeature([CheckRun, CheckRunItem, RcaSession]),
    ],
    controllers: [DashboardConsoleController],
    providers: [DashboardService],
})
export class DashboardModule {}
