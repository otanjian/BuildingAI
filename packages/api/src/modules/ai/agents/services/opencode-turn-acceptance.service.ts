import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AgentChatMessage,
    AgentChatRecord,
    AgentOpencodeTurn,
    File,
    OPENCODE_TURN_ACTIVE_STATUSES,
} from "@buildingai/db/entities";
import { DataSource, In, type Repository } from "@buildingai/db/typeorm";
import { UserDictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable } from "@nestjs/common";
import { createIdGenerator } from "ai";
import { createHash, randomUUID } from "node:crypto";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { OpencodeApiService } from "../integrations/opencode-api.service";
import { resolveArtifactRoot } from "../utils/opencode-artifact-path";
import { buildOpencodeSystemPrompt } from "../utils/opencode-system-prompt";
import {
    buildOpencodeDispatchSnapshot,
    canonicalizeOpencodeTurnCommand,
    hashOpencodeRuntime,
    hashOpencodeTurnCommand,
    type OpencodeTurnCommand,
} from "../utils/opencode-turn-command";
import { AgentsService } from "./agents.service";

const generateOpencodeMessageId = createIdGenerator({ prefix: "msg", size: 24 });

export type OpencodeTurnAcceptanceInput = {
    turnId: string;
    conversationId: string;
    agentId: string;
    userId?: string;
    anonymousIdentifier?: string;
    message: { role: string; parts?: Array<Record<string, unknown>> };
    formVariables?: Record<string, string>;
    formFieldsInputs?: Record<string, unknown>;
    isDebug?: boolean;
};

export type OpencodeTurnAcceptanceResult = {
    conversationId: string;
    turnId: string;
    status: AgentOpencodeTurn["status"];
    duplicate: boolean;
};

export type OpencodeTurnStatusResult = {
    conversationId: string;
    turnId: string;
    status: AgentOpencodeTurn["status"];
    cancelRequested: boolean;
    assistantMessageId: string | null;
    error: { code: string | null; message: string | null } | null;
    createdAt: Date;
    updatedAt: Date;
    startedAt: Date | null;
    completedAt: Date | null;
    lastActivityAt: Date | null;
};

@Injectable()
export class OpencodeTurnAcceptanceService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        @InjectRepository(AgentOpencodeTurn)
        private readonly turnRepository: Repository<AgentOpencodeTurn>,
        @InjectRepository(File)
        private readonly fileRepository: Repository<File>,
        private readonly agentsService: AgentsService,
        private readonly agentConfigService: AgentConfigService,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly userDictService: UserDictService,
    ) {}

    hashRequest(input: OpencodeTurnAcceptanceInput): string {
        return hashOpencodeTurnCommand(this.toCommand(input));
    }

    async accept(input: OpencodeTurnAcceptanceInput): Promise<OpencodeTurnAcceptanceResult> {
        const command = canonicalizeOpencodeTurnCommand(this.toCommand(input));
        const requestHash = hashOpencodeTurnCommand(command);
        const fastDuplicate = await this.turnRepository.findOne({
            where: { id: input.turnId },
            relations: { conversation: true },
        });
        if (fastDuplicate) {
            return this.verifyDuplicate(fastDuplicate, input, requestHash);
        }

        const queryRunner = this.dataSource.createQueryRunner();
        let connected = false;
        let transactionStarted = false;
        try {
            await queryRunner.connect();
            connected = true;
            await queryRunner.startTransaction("READ COMMITTED");
            transactionStarted = true;
            await queryRunner.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
                `opencode-turn:${input.turnId}`,
            ]);

            const lockedDuplicate = await queryRunner.manager.findOne(AgentOpencodeTurn, {
                where: { id: input.turnId },
                relations: { conversation: true },
            });
            if (lockedDuplicate) {
                const duplicate = this.verifyDuplicate(lockedDuplicate, input, requestHash);
                await queryRunner.commitTransaction();
                transactionStarted = false;
                return duplicate;
            }

            await queryRunner.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
                `opencode-conversation:${input.conversationId}`,
            ]);

            let record = await queryRunner.manager.findOne(AgentChatRecord, {
                where: { id: input.conversationId },
                lock: { mode: "pessimistic_write" },
            });
            if (record) {
                this.assertConversationOwner(record, input);
                const active = await queryRunner.manager.findOne(AgentOpencodeTurn, {
                    where: {
                        conversationId: input.conversationId,
                        status: In([...OPENCODE_TURN_ACTIVE_STATUSES]),
                    },
                });
                if (active) {
                    throw HttpErrorFactory.conflict(
                        `Conversation already has active turn ${active.id}`,
                    );
                }
            } else if (input.userId || input.anonymousIdentifier) {
                const owner = input.anonymousIdentifier
                    ? `anonymous:${input.anonymousIdentifier}`
                    : `user:${input.userId}`;
                const ownerHash = createHash("sha256").update(owner).digest("hex");
                await queryRunner.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
                    `opencode-owner:${input.agentId}:${ownerHash}`,
                ]);
            }

            const agent = await this.agentsService.getAgentByIdOrThrow(input.agentId);
            if (agent.createMode !== "opencode") {
                throw HttpErrorFactory.badRequest("Only OpenCode agents accept durable turns");
            }

            const normalizedRuntime = this.opencodeApiService.normalizeConfig(
                agent.thirdPartyIntegration,
            );
            const runtimeConfigHash = hashOpencodeRuntime(normalizedRuntime);
            const billing = await this.resolveBilling(input);
            const resolvedAttachmentUrls = await this.resolveAuthorizedAttachments(
                command,
                input,
            );
            const personalParams = input.userId
                ? await this.userDictService.getGroupValues(
                      input.userId,
                      "personalParams",
                  )
                : undefined;
            const artifactRoot = resolveArtifactRoot({
                workspace: normalizedRuntime.workspace,
                conversationId: input.conversationId,
                artifactDirTemplate: normalizedRuntime.artifactDirTemplate,
            });
            const rolePrompt = this.applyFormValues(
                agent.rolePrompt ?? "",
                command.formVariables,
                command.formFieldsInputs,
            );
            const system = buildOpencodeSystemPrompt({
                rolePrompt,
                personalParams,
                systemHint: [
                    "You are running as a Bowi AI OpenCode agent.",
                    `Conversation id: ${input.conversationId}`,
                    `Write report/dashboard HTML artifacts ONLY under: ${artifactRoot}`,
                    "Do not write HTML reports into other conversations' artifact directories.",
                ].join("\n"),
            });
            const promptParts = command.message.parts.map((part) =>
                part.type === "text"
                    ? { type: "text" as const, text: part.text }
                    : {
                          type: "file" as const,
                          mime: part.mediaType,
                          url: part.url,
                          ...(part.filename ? { filename: part.filename } : {}),
                      },
            );
            const dispatchSnapshot = buildOpencodeDispatchSnapshot({
                command,
                promptParts,
                resolvedAttachmentUrls,
                system,
                model: normalizedRuntime.model,
                artifactRoot,
                workspace: normalizedRuntime.workspace,
                billing,
            });

            const isNewConversation = !record;
            if (!record) {
                record = queryRunner.manager.create(AgentChatRecord, {
                    id: input.conversationId,
                    agentId: input.agentId,
                    userId: input.userId,
                    anonymousIdentifier: input.anonymousIdentifier,
                    title: this.titleFromCommand(command),
                    messageCount: 0,
                    totalTokens: 0,
                    consumedPower: 0,
                    isDeleted: false,
                    feedbackStatus: { like: 0, dislike: 0 },
                    metadata: input.isDebug ? { isDebug: true } : undefined,
                });
                record = await queryRunner.manager.save(AgentChatRecord, record);
            }

            const latestMessage = await queryRunner.manager.findOne(AgentChatMessage, {
                where: { conversationId: record.id, status: "completed" },
                order: { createdAt: "DESC" },
            });
            const inputMessageId = randomUUID();
            const inputMessage = await queryRunner.manager.save(
                AgentChatMessage,
                queryRunner.manager.create(AgentChatMessage, {
                    id: inputMessageId,
                    conversationId: record.id,
                    agentId: input.agentId,
                    userId: input.userId,
                    anonymousIdentifier: input.anonymousIdentifier,
                    parentId: latestMessage?.id,
                    message: { id: inputMessageId, ...command.message },
                    status: "completed",
                    formVariables: command.formVariables,
                    formFieldsInputs: command.formFieldsInputs,
                }),
            );

            await queryRunner.manager.save(
                AgentOpencodeTurn,
                queryRunner.manager.create(AgentOpencodeTurn, {
                    id: input.turnId,
                    conversationId: record.id,
                    requestHash,
                    dispatchSnapshot,
                    artifactBaseline: null,
                    runtimeConfigHash,
                    inputMessageId: inputMessage.id,
                    assistantMessageId: null,
                    opencodeUserMessageId: generateOpencodeMessageId(),
                    status: "accepted",
                    lastActivityAt: new Date(),
                    remoteEvidenceHash: null,
                    errorCode: null,
                    errorMessage: null,
                    leaseToken: null,
                    leaseExpiresAt: null,
                    cancelRequestedAt: null,
                    startedAt: null,
                    completedAt: null,
                }),
            );

            await queryRunner.manager.increment(
                AgentChatRecord,
                { id: record.id },
                "messageCount",
                1,
            );
            if (isNewConversation && (input.userId || input.anonymousIdentifier)) {
                const ownerWhere = input.anonymousIdentifier
                    ? {
                          agentId: input.agentId,
                          anonymousIdentifier: input.anonymousIdentifier,
                          isDeleted: false,
                      }
                    : {
                          agentId: input.agentId,
                          userId: input.userId!,
                          isDeleted: false,
                      };
                const ownerConversationCount = await queryRunner.manager.count(AgentChatRecord, {
                    where: ownerWhere,
                });
                if (ownerConversationCount === 1) {
                    await queryRunner.manager.increment(
                        Agent,
                        { id: input.agentId },
                        "userCount",
                        1,
                    );
                }
            }
            await queryRunner.commitTransaction();
            transactionStarted = false;
            return {
                conversationId: record.id,
                turnId: input.turnId,
                status: "accepted",
                duplicate: false,
            };
        } catch (error) {
            if (transactionStarted) {
                await queryRunner.rollbackTransaction();
            }
            throw error;
        } finally {
            if (connected) await queryRunner.release();
        }
    }

    async getStatus(input: {
        agentId: string;
        turnId: string;
        userId?: string;
        anonymousIdentifier?: string;
    }): Promise<OpencodeTurnStatusResult> {
        const turn = await this.turnRepository.findOne({
            where: { id: input.turnId },
            relations: { conversation: true },
        });
        if (!turn) throw HttpErrorFactory.notFound("OpenCode turn not found");
        this.assertConversationOwner(turn.conversation, input);
        return this.toStatusResult(turn);
    }

    async requestCancel(input: {
        agentId: string;
        turnId: string;
        userId?: string;
        anonymousIdentifier?: string;
    }): Promise<OpencodeTurnStatusResult> {
        return this.dataSource.transaction(async (manager) => {
            const turn = await manager.findOne(AgentOpencodeTurn, {
                where: { id: input.turnId },
                relations: { conversation: true },
                lock: { mode: "pessimistic_write" },
            });
            if (!turn) throw HttpErrorFactory.notFound("OpenCode turn not found");
            this.assertConversationOwner(turn.conversation, input);
            if (
                (turn.status === "accepted" || turn.status === "running") &&
                !turn.cancelRequestedAt
            ) {
                turn.cancelRequestedAt = new Date();
                await manager.save(AgentOpencodeTurn, turn);
            }
            return this.toStatusResult(turn);
        });
    }

    private toStatusResult(turn: AgentOpencodeTurn): OpencodeTurnStatusResult {
        return {
            conversationId: turn.conversationId,
            turnId: turn.id,
            status: turn.status,
            cancelRequested: Boolean(turn.cancelRequestedAt),
            assistantMessageId: turn.assistantMessageId,
            error:
                turn.errorCode || turn.errorMessage
                    ? { code: turn.errorCode, message: turn.errorMessage }
                    : null,
            createdAt: turn.createdAt,
            updatedAt: turn.updatedAt,
            startedAt: turn.startedAt ?? null,
            completedAt: turn.completedAt ?? null,
            lastActivityAt: turn.lastActivityAt ?? null,
        };
    }

    private toCommand(input: OpencodeTurnAcceptanceInput): OpencodeTurnCommand {
        return {
            agentId: input.agentId,
            conversationId: input.conversationId,
            owner: input.anonymousIdentifier
                ? { type: "anonymous", id: input.anonymousIdentifier }
                : { type: "user", id: input.userId ?? "" },
            message: input.message as OpencodeTurnCommand["message"],
            formVariables: input.formVariables,
            formFieldsInputs: input.formFieldsInputs,
            isDebug: input.isDebug === true,
        };
    }

    private verifyDuplicate(
        turn: AgentOpencodeTurn,
        input: OpencodeTurnAcceptanceInput,
        requestHash: string,
    ): OpencodeTurnAcceptanceResult {
        this.assertConversationOwner(turn.conversation, input);
        if (
            turn.conversationId !== input.conversationId ||
            turn.conversation.agentId !== input.agentId ||
            turn.requestHash !== requestHash
        ) {
            throw HttpErrorFactory.conflict("OpenCode turn identifier conflicts with another command");
        }
        return {
            conversationId: turn.conversationId,
            turnId: turn.id,
            status: turn.status,
            duplicate: true,
        };
    }

    private assertConversationOwner(
        record: AgentChatRecord,
        input: {
            agentId: string;
            userId?: string;
            anonymousIdentifier?: string;
        },
    ): void {
        const userMatches = record.userId
            ? Boolean(input.userId && record.userId === input.userId)
            : true;
        const ownerMatches = record.anonymousIdentifier
            ? userMatches && record.anonymousIdentifier === input.anonymousIdentifier
            : userMatches && Boolean(record.userId);
        if (!ownerMatches || record.agentId !== input.agentId || record.isDeleted) {
            throw HttpErrorFactory.notFound("OpenCode turn not found");
        }
    }

    private async resolveBilling(input: OpencodeTurnAcceptanceInput) {
        const config = await this.agentConfigService.getConfig();
        const item = config.createTypes.find((candidate) => candidate.key === "opencode");
        const enabled =
            input.isDebug !== true &&
            item?.enabled === true &&
            item.billingMode === "points" &&
            Number(item.points ?? 0) > 0;
        const billing = {
            enabled,
            power: enabled ? Number(item?.points ?? 0) : 0,
            tokens: 1000,
        };
        if (enabled && input.userId) {
            await this.agentBillingHandler.validateUserPower(input.userId, billing);
        }
        return billing;
    }

    private async resolveAuthorizedAttachments(
        command: OpencodeTurnCommand,
        input: OpencodeTurnAcceptanceInput,
    ): Promise<string[]> {
        const urls = command.message.parts
            .filter((part) => part.type === "file")
            .map((part) => part.url);
        if (urls.length === 0) return [];
        if (input.anonymousIdentifier || !input.userId) {
            throw HttpErrorFactory.badRequest(
                "Anonymous OpenCode turns cannot use attachments until upload ownership is verifiable",
            );
        }

        const candidates = new Set<string>();
        for (const url of urls) {
            const parsed = new URL(url);
            candidates.add(url);
            candidates.add(parsed.pathname);
        }
        const files = await this.fileRepository.find({
            where: { uploaderId: input.userId, url: In([...candidates]) },
        });
        const authorized = new Set<string>();
        for (const file of files) {
            if (!file.url) continue;
            for (const commandUrl of urls) {
                const commandParsed = new URL(commandUrl);
                const fileParsed = file.url.startsWith("http") ? new URL(file.url) : null;
                if (
                    file.url === commandUrl ||
                    file.url === commandParsed.pathname ||
                    fileParsed?.pathname === commandParsed.pathname
                ) {
                    authorized.add(commandUrl);
                }
            }
        }
        if (authorized.size !== urls.length) {
            throw HttpErrorFactory.badRequest(
                "OpenCode command contains an unresolved or unauthorized attachment",
            );
        }
        return [...authorized];
    }

    private applyFormValues(
        prompt: string,
        formVariables: Record<string, string> = {},
        formFieldsInputs: Record<string, unknown> = {},
    ): string {
        const values = { ...formFieldsInputs, ...formVariables };
        return prompt.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
            values[key] == null ? match : String(values[key]),
        );
    }

    private titleFromCommand(command: OpencodeTurnCommand): string {
        const text = command.message.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        return (text || "New conversation").slice(0, 20);
    }
}
