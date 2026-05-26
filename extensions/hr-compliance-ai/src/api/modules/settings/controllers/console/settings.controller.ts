import { BaseController } from "@buildingai/base";
import { ExtensionConsoleController } from "@buildingai/core/decorators";
import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Body, Get, Post, Put } from "@nestjs/common";

import { UpdateSettingsDto } from "../../dto/update-settings.dto";
import { HrCompliancePlatformAgentService } from "../../services/hr-compliance-platform-agent.service";
import { SettingsService } from "../../services/settings.service";

@ExtensionConsoleController("settings", "HRC Settings")
export class SettingsConsoleController extends BaseController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly ehcsPlatformAgentService: HrCompliancePlatformAgentService,
    ) {
        super();
    }

    @Get()
    async get() {
        const s = await this.settingsService.getOrCreate();
        return {
            agentId: s.agentId,
        };
    }

    @Get("agent-options")
    async agentOptions(@Playground() user: UserPlayground) {
        return this.ehcsPlatformAgentService.listAgentOptions(user.id);
    }

    @Get("agent-update-preview")
    agentUpdatePreview() {
        return this.ehcsPlatformAgentService.getAgentUpdatePreview();
    }

    @Post("provision-agent")
    async provisionAgent(@Playground() user: UserPlayground) {
        return this.ehcsPlatformAgentService.provisionForUser(user.id);
    }

    @Put()
    async update(@Body() dto: UpdateSettingsDto) {
        const s = await this.settingsService.update(dto);
        return {
            agentId: s.agentId,
        };
    }
}
