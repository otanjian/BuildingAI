jest.mock("@buildingai/core/modules", () => ({
    hashInboundToken: jest.fn(() => "token-hash"),
    matchesInboundToken: jest.fn(() => false),
}));

import { agentPublicAccessRegistry } from "@common/decorators/agent-public-access.registry";

import { AgentAliasRewriteMiddleware } from "./agent-alias-rewrite.middleware";

function createRequest() {
    return {
        method: "POST",
        path: "/v1/chat-messages",
        headers: { authorization: "Bearer token" },
        url: "/v1/chat-messages",
    } as any;
}

function createMiddleware(available: boolean) {
    const agent = {
        id: "agent-1",
        createBy: "user-1",
        tenantId: "tenant-1",
        projectId: "project-1",
        publishConfig: { enableSite: true, accessToken: "token" },
        publishedToSquare: true,
        squarePublishStatus: "approved",
    };
    const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(agent),
    };
    const agentRepository = { createQueryBuilder: jest.fn(() => queryBuilder) };
    const userRepository = {
        findOne: jest.fn().mockResolvedValue({
            id: "user-1",
            username: "owner",
            isRoot: false,
        }),
    };
    const agentVersionService = {
        hasApprovedMarketplacePublish: jest.fn().mockResolvedValue(available),
    };
    return {
        middleware: new AgentAliasRewriteMiddleware(
            agentRepository as any,
            userRepository as any,
            agentVersionService as any,
        ),
        agentVersionService,
    };
}

describe("AgentAliasRewriteMiddleware", () => {
    beforeEach(() => {
        agentPublicAccessRegistry.splice(0, agentPublicAccessRegistry.length);
        agentPublicAccessRegistry.push({
            aliasPath: "chat-messages",
            targetPath: ":id/chat/stream",
            httpMethod: "POST",
        });
    });

    it("allows a marketplace-approved Agent without a production release", async () => {
        const { middleware, agentVersionService } = createMiddleware(true);
        const request = createRequest();
        const next = jest.fn();

        await middleware.use(request, {} as any, next);

        expect(agentVersionService.hasApprovedMarketplacePublish).toHaveBeenCalledWith("agent-1", {
            tenantId: "tenant-1",
            projectId: "project-1",
        });
        expect(next).toHaveBeenCalledTimes(1);
        expect(request.url).toBe("/api/web/ai-agents/agent-1/chat/stream");
    });

    it("rejects an Agent that is not marketplace-approved", async () => {
        const { middleware } = createMiddleware(false);
        const next = jest.fn();

        await expect(middleware.use(createRequest(), {} as any, next)).rejects.toThrow(
            "Agent is not published and approved in the marketplace",
        );
        expect(next).not.toHaveBeenCalled();
    });
});
