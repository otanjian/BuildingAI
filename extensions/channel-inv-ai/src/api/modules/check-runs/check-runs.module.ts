import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { CheckResult } from "../../db/entities/check-result.entity";
import { CheckRunItem } from "../../db/entities/check-run-item.entity";
import { CheckRun } from "../../db/entities/check-run.entity";
import { RulesModule } from "../rules/rules.module";
import { CheckRunsConsoleController } from "./controllers/console/check-runs.controller";
import { CheckRunsService } from "./services/check-runs.service";

@Module({
    imports: [TypeOrmModule.forFeature([CheckRun, CheckRunItem, CheckResult]), RulesModule],
    controllers: [CheckRunsConsoleController],
    providers: [CheckRunsService],
    exports: [CheckRunsService],
})
export class CheckRunsModule {}
