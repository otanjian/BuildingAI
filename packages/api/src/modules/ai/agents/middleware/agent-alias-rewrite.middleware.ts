import { hashInboundToken, matchesInboundToken } from "@buildingai/core/modules";
import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Agent, User } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import { agentPublicAccessRegistry } from "@common/decorators/agent-public-access.registry";
import { setRequestAuthContext } from "@common/types/request-auth-context";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { Repository } from "typeorm";

import { AgentVersionService } from "../services/agent-version.service";

@Injectable()
export class AgentAliasRewriteMiddleware implements NestMiddleware {
    constructor(
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly agentVersionService: AgentVersionService,
    ) {}

    async use(req: Request, _res: Response, next: NextFunction) {
        const entry = agentPublicAccessRegistry.find((e) => {
            if (req.method !== e.httpMethod) return false;
            const pattern = `^/v1/${e.aliasPath.replace(/:[^/]+/g, "[^/]+")}$`;
            return new RegExp(pattern).test(req.path);
        });

        if (!entry) {
            return next();
        }

        const token = this.extractBearerToken(req);
        if (!token) {
            throw HttpErrorFactory.unauthorized("API key or site access token is required");
        }

        let tokenHash = "";
        try {
            tokenHash = hashInboundToken(token);
        } catch {
            // Production without the hash key fails closed by matching nothing.
        }

        const agent = await this.agentRepository
            .createQueryBuilder("agent")
            .where(
                `(
                    ((agent.publish_config ->> 'apiKeyHash' IS NOT NULL AND agent.publish_config ->> 'apiKeyHash' = :tokenHash)
                      OR (agent.publish_config ->> 'apiKey' = :token)) AND agent.publish_config ->> 'enableApiKey' = 'true'
                    OR
                    ((agent.publish_config ->> 'accessTokenHash' IS NOT NULL AND agent.publish_config ->> 'accessTokenHash' = :tokenHash)
                      OR (agent.publish_config ->> 'accessToken' = :token)) AND agent.publish_config ->> 'enableSite' = 'true'
                )`,
                { token, tokenHash },
            )
            .getOne();

        if (!agent) {
            throw HttpErrorFactory.unauthorized(
                "Invalid credential, or API key / site embedding access is not enabled",
            );
        }

        // Marketplace approval is the availability gate for the current published runtime.
        // Credential validation above remains the authentication boundary.
        if (
            !(await this.agentVersionService.hasApprovedMarketplacePublish(agent.id, {
                tenantId: agent.tenantId,
                projectId: agent.projectId,
            }))
        ) {
            throw HttpErrorFactory.forbidden(
                "Agent is not published and approved in the marketplace",
            );
        }

        const user = await this.userRepository.findOne({ where: { id: agent.createBy } });
        if (!user) {
            throw HttpErrorFactory.unauthorized("Agent creator not found");
        }

        const playground: UserPlayground = {
            id: user.id,
            username: user.username,
            isRoot: user.isRoot,
            permissions: [],
            role: null,
        };

        req["user"] = playground;
        setRequestAuthContext(req, {
            source:
                agent.publishConfig?.apiKey === token ||
                matchesInboundToken(token, agent.publishConfig?.apiKeyHash)
                    ? "publish_key"
                    : "site_access_token",
            agentId: agent.id,
            tenantId: agent.tenantId ?? undefined,
        });

        const webPrefix = process.env.VITE_APP_WEB_API_PREFIX?.replace(/^\/+/, "") ?? "api/web";

        const aliasParamNames = (entry.aliasPath.match(/:[^/]+/g) ?? []).map((p) => p.slice(1));
        const aliasPattern = `^/v1/${entry.aliasPath.replace(/:[^/]+/g, "([^/]+)")}$`;
        const matched = req.path.match(new RegExp(aliasPattern));

        let resolvedTarget = entry.targetPath.replace(":id", agent.id);
        aliasParamNames.forEach((name, i) => {
            resolvedTarget = resolvedTarget.replace(`:${name}`, matched?.[i + 1] ?? "");
        });

        const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        req.url = `/${webPrefix}/ai-agents/${resolvedTarget}${qs}`;
        delete (req as any)._parsedUrl;

        return next();
    }

    private extractBearerToken(req: Request): string | undefined {
        const [type, token] = req.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }
}
