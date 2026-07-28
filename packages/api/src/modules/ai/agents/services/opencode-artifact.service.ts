import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

import { OpencodeApiService } from "../integrations/opencode-api.service";
import { AgentsService } from "./agents.service";
import { AgentChatRecordService } from "./agent-chat-record.service";
import {
    resolveArtifactRoot,
    resolveSafeArtifactFilePath,
} from "../utils/opencode-artifact-path";

export interface ArtifactFileResult {
    absolutePath: string;
    contentType: string;
    size: number;
    stream: Readable;
}

/**
 * Serve conversation-scoped OpenCode artifacts with path isolation.
 */
@Injectable()
export class OpencodeArtifactService {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly opencodeApiService: OpencodeApiService,
    ) {}

    async openArtifactFile(params: {
        agentId: string;
        conversationId: string;
        userId: string;
        anonymousIdentifier?: string;
        relativePath: string;
    }): Promise<ArtifactFileResult> {
        const agent = await this.agentsService.getAgentByIdOrThrow(params.agentId);
        if (agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("该智能体不是 OpenCode 模式");
        }

        const record = await this.agentChatRecordService.getConversation(params.conversationId);
        if (!record || record.agentId !== params.agentId) {
            throw HttpErrorFactory.notFound("对话不存在");
        }
        if (record.userId !== params.userId) {
            throw HttpErrorFactory.forbidden("无权访问该对话产物");
        }
        if (
            params.anonymousIdentifier &&
            record.anonymousIdentifier &&
            record.anonymousIdentifier !== params.anonymousIdentifier
        ) {
            throw HttpErrorFactory.forbidden("无权访问该对话产物");
        }

        const config = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);
        const artifactRoot =
            typeof record.metadata?.artifactRoot === "string" && record.metadata.artifactRoot
                ? record.metadata.artifactRoot
                : resolveArtifactRoot({
                      workspace: config.workspace,
                      conversationId: params.conversationId,
                      artifactDirTemplate: config.artifactDirTemplate,
                  });

        let absolutePath: string;
        try {
            absolutePath = resolveSafeArtifactFilePath({
                artifactRoot,
                relativePath: params.relativePath,
            });
        } catch {
            throw HttpErrorFactory.badRequest("非法产物路径");
        }

        if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
            throw HttpErrorFactory.notFound("产物文件不存在");
        }

        const stat = statSync(absolutePath);
        return {
            absolutePath,
            contentType: this.resolveContentType(absolutePath),
            size: stat.size,
            stream: createReadStream(absolutePath),
        };
    }

    private resolveContentType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case ".html":
            case ".htm":
                return "text/html; charset=utf-8";
            case ".css":
                return "text/css; charset=utf-8";
            case ".js":
                return "text/javascript; charset=utf-8";
            case ".json":
                return "application/json; charset=utf-8";
            case ".svg":
                return "image/svg+xml";
            case ".png":
                return "image/png";
            case ".jpg":
            case ".jpeg":
                return "image/jpeg";
            case ".gif":
                return "image/gif";
            case ".webp":
                return "image/webp";
            default:
                return "application/octet-stream";
        }
    }
}
