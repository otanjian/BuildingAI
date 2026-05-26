import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Module } from "@nestjs/common";

import { CheckRule } from "../../db/entities/check-rule.entity";
import { RulesConsoleController } from "./controllers/console/rules.controller";
import { RulesService } from "./services/rules.service";

@Module({
    imports: [TypeOrmModule.forFeature([CheckRule])],
    controllers: [RulesConsoleController],
    providers: [RulesService],
    exports: [RulesService],
})
export class RulesModule {}
