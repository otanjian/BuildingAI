import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import { Body, Get, Param, Patch, Post, Put } from "@nestjs/common";

import { CreateRuleDto } from "../../dto/create-rule.dto";
import { UpdateRuleDto } from "../../dto/update-rule.dto";
import { RulesService } from "../../services/rules.service";

@ExtensionConsoleController("rules", "MFGV Rules")
export class RulesConsoleController extends BaseController {
    constructor(private readonly rulesService: RulesService) {
        super();
    }

    @Get()
    list() {
        return this.rulesService.list();
    }

    @Post()
    create(@Body() dto: CreateRuleDto) {
        return this.rulesService.create(dto);
    }

    @Put(":ruleId")
    update(@Param("ruleId") ruleId: string, @Body() dto: UpdateRuleDto) {
        return this.rulesService.update(ruleId, dto);
    }

    @Patch(":ruleId/toggle")
    toggle(@Param("ruleId") ruleId: string) {
        return this.rulesService.toggle(ruleId);
    }
}
