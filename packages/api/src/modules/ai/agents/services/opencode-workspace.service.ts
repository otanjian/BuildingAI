import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import {
    type OpencodeFileContent,
    type OpencodeFileNode,
    OpencodeApiService,
} from "../integrations/opencode-api.service";
import {
    filterWorkspaceEntries,
    resolveSafeWorkspaceRelativePath,
    toOpenCodeListPath,
} from "../utils/opencode-workspace-path";
import { AgentsService } from "./agents.service";

/**
 * Authenticated OpenCode workspace browser (list + read-only content).
 */
@Injectable()
export class OpencodeWorkspaceService {
    constructor(
        private readonly agentsService: AgentsService,
        private readonly opencodeApiService: OpencodeApiService,
    ) {}

    async listDirectory(params: {
        agentId: string;
        path?: string;
    }): Promise<{ path: string; entries: OpencodeFileNode[] }> {
        const agent = await this.requireOpencodeAgent(params.agentId);
        const config = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);

        let relative: string;
        try {
            relative = resolveSafeWorkspaceRelativePath({
                workspace: config.workspace,
                requestPath: params.path ?? "",
            });
        } catch {
            throw HttpErrorFactory.badRequest("非法工作区路径");
        }

        const listPath = toOpenCodeListPath(relative || ".");
        const entries = await this.opencodeApiService.listFiles({
            config: agent.thirdPartyIntegration,
            path: listPath,
        });

        return {
            path: relative || ".",
            entries: filterWorkspaceEntries(entries),
        };
    }

    async readFile(params: {
        agentId: string;
        path: string;
    }): Promise<OpencodeFileContent> {
        const agent = await this.requireOpencodeAgent(params.agentId);
        const config = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);

        let relative: string;
        try {
            relative = resolveSafeWorkspaceRelativePath({
                workspace: config.workspace,
                requestPath: params.path,
            });
        } catch {
            throw HttpErrorFactory.badRequest("非法工作区路径");
        }
        if (!relative) {
            throw HttpErrorFactory.badRequest("文件路径不能为空");
        }

        return this.opencodeApiService.readFileContent({
            config: agent.thirdPartyIntegration,
            path: relative,
        });
    }

    private async requireOpencodeAgent(agentId: string) {
        const agent = await this.agentsService.getAgentByIdOrThrow(agentId);
        if (agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("该智能体不是 OpenCode 模式");
        }
        if (!this.opencodeApiService.hasValidConfig(agent.thirdPartyIntegration)) {
            throw HttpErrorFactory.badRequest("OpenCode Agent 未配置有效的 baseURL / workspace");
        }
        return agent;
    }
}
