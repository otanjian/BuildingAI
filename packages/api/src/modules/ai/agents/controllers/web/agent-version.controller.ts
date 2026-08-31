import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Get, Param, Post } from "@nestjs/common";

import { AgentVersionService } from "../../services/agent-version.service";

@WebController("ai-agents")
export class AgentVersionWebController {
    constructor(private readonly versions: AgentVersionService) {}

    @Get(":id/versions")
    async listVersions(@Param("id") agentId: string, @Playground() user: UserPlayground) {
        return this.versions.listVersions(agentId, {
            tenantId: (user as UserPlayground & { tenantId?: string }).tenantId,
            projectId: (user as UserPlayground & { projectId?: string }).projectId,
        });
    }

    @Get(":id/releases")
    async listReleases(@Param("id") agentId: string, @Playground() user: UserPlayground) {
        return this.versions.listReleases(agentId, {
            tenantId: (user as UserPlayground & { tenantId?: string }).tenantId,
            projectId: (user as UserPlayground & { projectId?: string }).projectId,
        });
    }

    @Get(":id/release-workspace")
    async workspace(@Param("id") agentId: string, @Playground() user: UserPlayground) {
        return this.versions.getReleaseWorkspace(agentId, this.scope(user));
    }

    @Get(":id/versions/shadow-compare")
    async shadowCompare(@Param("id") agentId: string, @Playground() user: UserPlayground) {
        return this.versions.shadowCompare(agentId, this.scope(user));
    }

    @Post(":id/versions/draft")
    async createDraft(@Param("id") agentId: string, @Body() body: { config?: Record<string, unknown>; releaseNote?: string }, @Playground() user: UserPlayground) {
        return this.versions.createDraft(agentId, body.config ?? {}, this.scope(user), body.releaseNote);
    }

    @Post("versions/:versionId/submit")
    async submit(@Param("versionId") versionId: string, @Playground() user: UserPlayground) {
        return this.versions.submit(versionId, this.scope(user));
    }

    @Post("versions/:versionId/evaluate")
    async evaluate(@Param("versionId") versionId: string, @Body() body: { passed?: boolean; evidence?: Record<string, unknown> }, @Playground() user: UserPlayground) {
        return this.versions.evaluateGate(versionId, { ...(body.evidence ?? {}), passed: body.passed === true }, this.scope(user));
    }

    @Post("versions/:versionId/release")
    async release(@Param("versionId") versionId: string, @Body() body: { environment?: "development" | "test" | "staging" | "production"; expectedRevision?: number; idempotencyKey?: string; cohortId?: string; trafficPercent?: number }, @Playground() user: UserPlayground) {
        return this.versions.createRelease(versionId, { ...this.scope(user), ...body });
    }

    @Post("releases/:releaseId/approve")
    async approve(@Param("releaseId") releaseId: string, @Body() body: { gateName?: string; evidence?: Record<string, unknown> }, @Playground() user: UserPlayground) {
        return this.versions.approveRelease(releaseId, body.gateName ?? "default", this.scope(user), body.evidence);
    }

    @Post("releases/:releaseId/rollback")
    async rollback(@Param("releaseId") releaseId: string, @Body() body: { expectedRevision?: number; idempotencyKey?: string }, @Playground() user: UserPlayground) {
        return this.versions.rollback(releaseId, { ...this.scope(user), ...body });
    }

    @Post("releases/:releaseId/pause")
    async pause(@Param("releaseId") releaseId: string, @Body() body: { expectedRevision?: number; idempotencyKey?: string }, @Playground() user: UserPlayground) {
        return this.versions.pause(releaseId, { ...this.scope(user), ...body });
    }

    @Get(":id/active-version")
    async active(@Param("id") agentId: string, @Playground() user: UserPlayground) {
        return this.versions.resolve(agentId, { ...this.scope(user), environment: "production" });
    }

    private scope(user: UserPlayground) {
        return {
            tenantId: (user as UserPlayground & { tenantId?: string }).tenantId,
            projectId: (user as UserPlayground & { projectId?: string }).projectId,
            actorId: user.id,
        };
    }
}
