import { UserDictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { AgentChatRecordService } from "./agent-chat-record.service";
import { AgentsService } from "./agents.service";
import {
    resolveOpencodeCredentialOverrides,
    type OpencodeCredentialResolutionInput,
} from "../utils/opencode-credential-injection";

@Injectable()
export class OpencodeCredentialService {
    constructor(
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentsService: AgentsService,
        private readonly userDictService: UserDictService,
    ) {}

    async resolve(input: Omit<OpencodeCredentialResolutionInput, "personalParams"> & { sessionId: string }) {
        const record = await this.agentChatRecordService.findConversationByOpencodeSessionId(
            input.sessionId,
        );
        if (!record) throw HttpErrorFactory.notFound("OpenCode session is not mapped");

        const agent = await this.agentsService.findOneById(record.agentId);
        if (!agent || agent.createMode !== "opencode") {
            throw HttpErrorFactory.forbidden("OpenCode credentials are unavailable for this agent");
        }
        if (!record.userId) return { overrides: {} };

        const personalParams = await this.userDictService.getGroupValues(
            record.userId,
            "personalParams",
        );
        return {
            overrides: resolveOpencodeCredentialOverrides({
                toolName: input.toolName,
                arguments: input.arguments,
                personalParams,
            }),
        };
    }
}
