import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { RcaSession } from "../../db/entities/rca-session.entity";
import { AnomaliesModule } from "../anomalies/anomalies.module";
import { RcaConsoleController } from "./controllers/console/rca.controller";
import { RcaService } from "./services/rca.service";

@Module({
    imports: [TypeOrmModule.forFeature([RcaSession]), AnomaliesModule],
    controllers: [RcaConsoleController],
    providers: [RcaService],
})
export class RcaModule {}
