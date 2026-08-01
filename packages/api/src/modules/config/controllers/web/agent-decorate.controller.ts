import { BaseController } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { BuildFileUrl } from "@buildingai/decorators/file-url.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Get, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { QueryAgentDecorateItemsDto } from "../../dto/agent-decorate.dto";
import { AgentDecorateService } from "../../services/agent-decorate.service";

@WebController("agent-decorate")
export class AgentDecorateWebController extends BaseController {
    constructor(private readonly agentDecorateService: AgentDecorateService) {
        super();
    }

    @Get()
    @Public()
    @BuildFileUrl(["**.heroImageUrl", "**.overlayIconUrl", "banners.*.imageUrl"])
    async get() {
        return await this.agentDecorateService.getConfig();
    }

    @Get("items")
    @Public()
    @BuildFileUrl(["items.*.avatar", "items.*.creator.avatar", "items.*.primaryModel.iconUrl"])
    async getItems(@Query() query: QueryAgentDecorateItemsDto, @Req() req: Request) {
        const user = req.user as UserPlayground | undefined;
        return await this.agentDecorateService.paginateItems(
            {
                page: query.page ?? 1,
                pageSize: query.pageSize ?? 20,
                keyword: query.keyword,
                tagId: query.tagId,
            },
            { forPublic: true, userId: user?.id, isRoot: user?.isRoot === 1 },
        );
    }
}
