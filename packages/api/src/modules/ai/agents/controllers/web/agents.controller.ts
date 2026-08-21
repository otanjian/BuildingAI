import { PaginationResult } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent, User } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { BuildFileUrl } from "@buildingai/decorators";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { Public } from "@buildingai/decorators/public.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";

import { AgentDashboardQueryDto } from "../../dto/web/agent/agent-dashboard-query.dto";
import { CopyAgentFromSquareDto } from "../../dto/web/agent/copy-agent-from-square.dto";
import { CreateAgentDto } from "../../dto/web/agent/create-agent.dto";
import { ListMyAgentsDto } from "../../dto/web/agent/list-my-agents.dto";
import { ListSquareAgentsDto } from "../../dto/web/agent/list-square-agents.dto";
import { UpdateSensitiveWordConfigDto } from "../../dto/web/agent/sensitive-word-config.dto";
import { UpdateAgentDto } from "../../dto/web/agent/update-agent.dto";
import { PublishToSquareDto } from "../../dto/web/publish/square-publish.dto";
import {
    type AgentDashboardResult,
    AgentDashboardService,
} from "../../services/agent-dashboard.service";
import { AgentsService } from "../../services/agents.service";
import { SensitiveWordConfigService } from "../../services/sensitive-word-config.service";
import type { AgentSquareCardProjection } from "../../utils/agent-public-projection";

const AGENT_MANAGE_PERMISSION = { code: "agent.manage", name: "管理智能体", description: "创建和管理自己的智能体" };

@WebController("ai-agents")
export class AgentsWebController {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly agentDashboardService: AgentDashboardService,
        private readonly sensitiveWordConfigService: SensitiveWordConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    @Get("my-created")
    @Permissions(AGENT_MANAGE_PERMISSION)
    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    async listMyCreated(
        @Playground() user: UserPlayground,
        @Query() query: ListMyAgentsDto,
    ): Promise<PaginationResult<Agent>> {
        return this.agentsService.listMyAgents(user.id, query);
    }

    @Post()
    @Permissions(AGENT_MANAGE_PERMISSION)
    async create(@Playground() user: UserPlayground, @Body() dto: CreateAgentDto): Promise<Agent> {
        return this.agentsService.createAgent(user, dto);
    }

    @Post(":id/copy-from-square")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async copyFromSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() _dto: CopyAgentFromSquareDto,
    ): Promise<Agent> {
        return this.agentsService.copyFromSquare(id, user.id);
    }

    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    @Get("square")
    @Public()
    async listSquare(
        @Req() req: Request,
        @Query() query: ListSquareAgentsDto,
    ): Promise<
        PaginationResult<
            AgentSquareCardProjection & {
                creator: { id: string; nickname: string | null; avatar: string | null } | null;
            }
        >
    > {
        const user = req.user as UserPlayground | undefined;
        const result = await this.agentsService.listSquare(query, user?.id, user?.isRoot === 1);
        const creatorIds = [...new Set(result.items.map((a) => a.createBy).filter(Boolean))];

        if (creatorIds.length === 0) {
            return { ...result, items: result.items.map((a) => ({ ...a, creator: null })) };
        }

        const users = await this.userRepository.find({
            where: { id: In(creatorIds) },
            select: { id: true, nickname: true, avatar: true },
        });
        const creatorMap = new Map(
            users.map((u) => [
                u.id,
                { id: u.id, nickname: u.nickname ?? null, avatar: u.avatar ?? null },
            ]),
        );

        const items = result.items.map((a) => ({
            ...a,
            creator: creatorMap.get(a.createBy) ?? null,
        }));

        return { ...result, items };
    }

    @Get(":id/dashboard")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async dashboard(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Query() query: AgentDashboardQueryDto,
    ): Promise<AgentDashboardResult> {
        await this.agentsService.getAgentDetail(user, id);
        return this.agentDashboardService.getDashboard(id, query.startTime, query.endTime);
    }

    @Get(":id")
    @Permissions(AGENT_MANAGE_PERMISSION)
    @BuildFileUrl(["**.avatar", "**.chatAvatar"])
    async detail(@Playground() user: UserPlayground, @Param("id") id: string): Promise<Agent> {
        return this.agentsService.getAgentDetail(user, id);
    }

    @Patch(":id")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async update(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() dto: UpdateAgentDto,
    ): Promise<Agent> {
        return this.agentsService.updateAgent(user, id, dto);
    }

    @Patch(":id/sensitive-word-config")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async updateSensitiveWordConfig(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() dto: UpdateSensitiveWordConfigDto,
    ) {
        return this.sensitiveWordConfigService.updateCanonical(user.id, id, dto);
    }

    @Post(":id/publish-to-square")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async publishToSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
        @Body() dto: PublishToSquareDto,
    ): Promise<Agent> {
        return this.agentsService.publishToSquare(id, user.id, dto.tagIds, {
            allowCopy: dto.allowCopy,
        });
    }

    @Post(":id/unpublish-from-square")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async unpublishFromSquare(
        @Playground() user: UserPlayground,
        @Param("id") id: string,
    ): Promise<Agent> {
        return this.agentsService.unpublishFromSquare(id, user.id);
    }

    @Delete(":id")
    @Permissions(AGENT_MANAGE_PERMISSION)
    async deleteAgent(@Playground() user: UserPlayground, @Param("id") id: string): Promise<void> {
        await this.agentsService.deleteAgent(id, user.id);
    }
}
