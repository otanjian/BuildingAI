import path from "node:path";

import type { PaginationResult } from "@buildingai/base";
import { type UserPlayground } from "@buildingai/db";
import type { AgentChatMessage } from "@buildingai/db/entities";
import { BuildFileUrl } from "@buildingai/decorators";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { UserDictService } from "@buildingai/dict";
import { HttpErrorFactory } from "@buildingai/errors";
import type { SensitiveWordConfig, ThirdPartyIntegrationConfig } from "@buildingai/types";
import { AgentPublicAccess } from "@common/decorators/agent-public-access.decorator";
import { WebController } from "@common/decorators/controller.decorator";
import {
    Body,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import { validate as isUUID } from "uuid";

import {
    getRequestAuthContext,
    type RequestAuthSource,
} from "../../../../../common/types/request-auth-context";
import { AgentChatRequestDto } from "../../dto/web/chat/agent-chat-request.dto";
import { CreateAgentMessageFeedbackDto } from "../../dto/web/chat/agent-message-feedback.dto";
import { AgentSpeechRequestDto } from "../../dto/web/chat/agent-speech-request.dto";
import { ArchiveConversationDto } from "../../dto/web/chat/archive-conversation.dto";
import { CreateOperatorMessageDto } from "../../dto/web/chat/create-operator-message.dto";
import { ListAgentConversationsDto } from "../../dto/web/chat/list-agent-conversations.dto";
import { ListConversationMessagesDto } from "../../dto/web/chat/list-conversation-messages.dto";
import {
    OpencodeQuestionRejectDto,
    OpencodeQuestionReplyDto,
} from "../../dto/web/chat/opencode-question.dto";
import { OpencodeApiService } from "../../integrations/opencode-api.service";
import { OpencodeChatProvider } from "../../providers/opencode-chat.provider";
import { AgentChatCompletionService } from "../../services/agent-chat-completion.service";
import { AgentChatMessageService } from "../../services/agent-chat-message.service";
import { AgentChatMessageFeedbackService } from "../../services/agent-chat-message-feedback.service";
import type { AgentChatRecordWithUser } from "../../services/agent-chat-record.service";
import { AgentChatRecordService } from "../../services/agent-chat-record.service";
import { AgentVoiceService } from "../../services/agent-voice.service";
import { AgentsService } from "../../services/agents.service";
import { OpencodeArtifactService } from "../../services/opencode-artifact.service";
import { OpencodeWorkspaceService } from "../../services/opencode-workspace.service";
import { resolveArtifactRoot } from "../../utils/opencode-artifact-path";
import { isOpencodeDurableTurnsEnabled } from "../../utils/opencode-durable-rollout";
import {
    buildBuildingAIReportBase,
    buildOpencodeEmbedUrl,
    resolveBuildingAIWebOrigin,
} from "../../utils/opencode-embed";
import { buildOpencodeArtifactSystemHint } from "../../utils/opencode-report-instructions";
import {
    buildOpencodeSessionContext,
    OPENCODE_BUILDINGAI_CONTEXT_METADATA_KEY,
} from "../../utils/opencode-session-context";
import { hashOpencodeRuntime } from "../../utils/opencode-turn-command";
import { verifyAutomationPolicy } from "../../../../automation/application/automation-policy-assertion";
import { resolveFeishuIdentityAssertion } from "../../../../channel/feishu/feishu-identity";

@WebController("ai-agents")
export class AgentChatWebController {
    private readonly pendingOpencodeMetadataRefreshes = new Set<string>();
    private readonly pendingOpencodeTitleSyncs = new Set<string>();

    constructor(
        private readonly agentChatCompletionService: AgentChatCompletionService,
        private readonly agentVoiceService: AgentVoiceService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentChatMessageService: AgentChatMessageService,
        private readonly agentChatMessageFeedbackService: AgentChatMessageFeedbackService,
        private readonly agentsService: AgentsService,
        private readonly opencodeApiService: OpencodeApiService,
        private readonly opencodeArtifactService: OpencodeArtifactService,
        private readonly opencodeWorkspaceService: OpencodeWorkspaceService,
        private readonly opencodeChatProvider: OpencodeChatProvider,
        private readonly userDictService: UserDictService,
    ) {}

    /**
     * Read OpenCode workspace file content (read-only preview).
     * GET /ai-agents/:id/opencode/workspace/files/content?path=
     */
    @Get(":id/opencode/workspace/files/content")
    async getOpencodeWorkspaceFileContent(
        @Param("id") agentId: string,
        @Query("path") filePath?: string,
    ) {
        if (!filePath?.trim()) {
            throw HttpErrorFactory.badRequest("文件路径不能为空");
        }
        return this.opencodeWorkspaceService.readFile({
            agentId,
            path: filePath,
        });
    }

    /**
     * List OpenCode workspace directory entries (lazy tree).
     * GET /ai-agents/:id/opencode/workspace/files?path=
     */
    @Get(":id/opencode/workspace/files")
    async listOpencodeWorkspaceFiles(
        @Param("id") agentId: string,
        @Query("path") listPath?: string,
    ) {
        return this.opencodeWorkspaceService.listDirectory({
            agentId,
            path: listPath,
        });
    }

    @AgentPublicAccess({ route: "chat-messages", targetPath: ":id/chat/stream" })
    @Post(":id/chat/stream")
    async streamChat(
        @Param("id") agentId: string,
        @Body() dto: AgentChatRequestDto,
        @Playground() playground: UserPlayground,
        @Res() res: Response,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const authSource = this.resolveAuthSource(req, anonymousIdentifier);
        const feishuIdentity = this.resolveFeishuIdentity(req, agentId, anonymousIdentifier);

        if (anonymousIdentifier && dto.conversationId && isUUID(dto.conversationId)) {
            const record = await this.agentChatRecordService.getConversation(dto.conversationId);
            if (!record) throw HttpErrorFactory.notFound("对话不存在");
            if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
            if (record.anonymousIdentifier !== anonymousIdentifier) {
                throw HttpErrorFactory.forbidden("无权访问该对话");
            }
            if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权访问该对话");
        }

        const agent = await this.agentsService.findOneById(agentId);
        if (dto.conversationId && isUUID(dto.conversationId)) {
            const activeTurn = await this.agentChatRecordService.findActiveOpencodeTurn(
                dto.conversationId,
            );
            if (activeTurn) {
                throw HttpErrorFactory.conflict(
                    `Conversation has active durable OpenCode turn ${activeTurn.id}`,
                );
            }
        }
        if (isOpencodeDurableTurnsEnabled(agent)) {
            if (dto.trigger === "regenerate-message" || dto.parentId) {
                throw HttpErrorFactory.badRequest(
                    "OpenCode durable regeneration and historical branch sends are unsupported",
                );
            }
            throw HttpErrorFactory.conflict(
                "OpenCode durable turns require the opencode-turns endpoint",
            );
        }

        if (dto.responseMode === "blocking") {
            return this.handleBlockingChat(
                dto,
                agentId,
                playground.id,
                anonymousIdentifier,
                authSource,
                feishuIdentity,
                res,
                this.getAutomationToolPolicy(req, dto),
            );
        }

        const abortController = new AbortController();
        const abortSignal =
            (req as any).signal instanceof AbortSignal
                ? (req as any).signal
                : abortController.signal;

        if (!((req as any).signal instanceof AbortSignal)) {
            const handleDisconnect = () => {
                if (!res.writableEnded && !abortSignal.aborted) abortController.abort();
            };
            req.on("close", handleDisconnect);
            req.on("aborted", handleDisconnect);
            res.on("close", handleDisconnect);
            if (req.aborted || req.socket?.destroyed) abortController.abort();
        }

        const isRegenerate = dto.trigger === "regenerate-message" && !!dto.messageId;

        const isToolApprovalFlow =
            dto.message &&
            !dto.messages &&
            dto.message.role === "assistant" &&
            dto.message.parts?.some((part: any) => {
                const state = part?.state as string | undefined;
                return state === "approval-responded" || state === "output-denied";
            });

        await this.agentChatCompletionService.streamChat(
            {
                agentId,
                userId: playground.id,
                username: playground.username,
                authSource,
                anonymousIdentifier,
                mcpUserId: feishuIdentity?.userId,
                mcpAuthSource: feishuIdentity?.authSource,
                mcpConversationId: feishuIdentity?.conversationId,
                mcpAutomationScope: feishuIdentity?.automationScope,
                conversationId: dto.conversationId,
                saveConversation: dto.saveConversation ?? true,
                isDebug: dto.isDebug === true,
                messages: dto.messages ?? (dto.message ? [dto.message] : []),
                formVariables: dto.formVariables,
                formFieldsInputs: dto.formFieldsInputs,
                abortSignal,
                feature: dto.feature,
                isRegenerate,
                regenerateMessageId: dto.messageId,
                parentId: isRegenerate ? undefined : dto.parentId,
                regenerateParentId: isRegenerate ? dto.parentId : undefined,
                isToolApprovalFlow: !!isToolApprovalFlow,
                automationToolPolicy: this.getAutomationToolPolicy(req, dto) as any,
            },
            res,
        );
    }

    private async handleBlockingChat(
        dto: AgentChatRequestDto,
        agentId: string,
        userId: string,
        anonymousIdentifier: string | undefined,
        authSource: RequestAuthSource,
        feishuIdentity: ReturnType<typeof resolveFeishuIdentityAssertion>,
        res: Response,
        automationToolPolicy?: AgentChatRequestDto["automationToolPolicy"],
    ): Promise<void> {
        let fullText = "";
        let conversationId: string | undefined;
        let messageId: string | undefined;
        let mockWritableEnded = false;
        let mockHeadersSent = false;
        let sseBuffer = "";
        const textDecoder = new TextDecoder();
        let resolveMockFinished: (() => void) | undefined;
        const mockFinished = new Promise<void>((resolve) => {
            resolveMockFinished = resolve;
        });

        const consumeSseLine = (line: string) => {
            if (!line.startsWith("data: ")) return;
            try {
                const data = JSON.parse(line.slice(6));
                if (data.type === "text-delta" && data.delta) {
                    fullText += data.delta;
                }
                if (data.type === "data-conversation-id") {
                    conversationId = data.data;
                }
                if (data.type === "data-assistant-message-id") {
                    messageId = data.data;
                }
            } catch {
                // A single SSE event may be split across multiple writes.
                return;
            }
        };

        const mockRes = {
            get writableEnded() {
                return mockWritableEnded;
            },
            get headersSent() {
                return mockHeadersSent;
            },
            writeHead: () => {
                mockHeadersSent = true;
                return mockRes;
            },
            statusCode: 200,
            setHeader: () => {
                mockHeadersSent = true;
                return mockRes;
            },
            write: (chunk: Buffer | string) => {
                const str =
                    typeof chunk === "string"
                        ? chunk
                        : chunk instanceof Uint8Array
                          ? textDecoder.decode(chunk, { stream: true })
                          : String(chunk);
                sseBuffer += str;
                const lines = sseBuffer.split("\n");
                sseBuffer = lines.pop() ?? "";
                for (const line of lines) {
                    consumeSseLine(line.endsWith("\r") ? line.slice(0, -1) : line);
                }
                return true;
            },
            end: () => {
                const remaining = textDecoder.decode();
                if (remaining) sseBuffer += remaining;
                if (sseBuffer) consumeSseLine(sseBuffer);
                mockWritableEnded = true;
                resolveMockFinished?.();
            },
            on: () => mockRes,
            once: () => mockRes,
            emit: () => true,
            flushHeaders: () => {},
        } as unknown as Response;

        const isRegenerate = dto.trigger === "regenerate-message" && !!dto.messageId;
        const isToolApprovalFlow =
            dto.message &&
            !dto.messages &&
            dto.message.role === "assistant" &&
            dto.message.parts?.some((part: any) => {
                const state = part?.state as string | undefined;
                return state === "approval-responded" || state === "output-denied";
            });

        await this.agentChatCompletionService.streamChat(
            {
                agentId,
                userId,
                authSource,
                anonymousIdentifier,
                mcpUserId: feishuIdentity?.userId,
                mcpAuthSource: feishuIdentity?.authSource,
                mcpConversationId: feishuIdentity?.conversationId,
                mcpAutomationScope: feishuIdentity?.automationScope,
                conversationId: dto.conversationId,
                saveConversation: dto.saveConversation ?? true,
                isDebug: dto.isDebug === true,
                messages: dto.messages ?? (dto.message ? [dto.message] : []),
                formVariables: dto.formVariables,
                formFieldsInputs: dto.formFieldsInputs,
                feature: dto.feature,
                isRegenerate,
                regenerateMessageId: dto.messageId,
                parentId: isRegenerate ? undefined : dto.parentId,
                regenerateParentId: isRegenerate ? dto.parentId : undefined,
                isToolApprovalFlow: !!isToolApprovalFlow,
                automationToolPolicy: automationToolPolicy as any,
            },
            mockRes,
        );
        await mockFinished;

        res.json({
            event: "message",
            conversationId,
            messageId,
            answer: fullText,
            createdAt: Math.floor(Date.now() / 1000),
        });
    }

    private getAutomationToolPolicy(req: Request, dto: AgentChatRequestDto) {
        if (req.headers["x-automation-context"] !== "server") return undefined;
        const runId = req.headers["x-automation-run"];
        const signature = req.headers["x-automation-policy-signature"];
        return verifyAutomationPolicy(
            Array.isArray(runId) ? runId[0] : runId,
            dto.automationToolPolicy,
            Array.isArray(signature) ? signature[0] : signature,
        )
            ? dto.automationToolPolicy
            : undefined;
    }

    @AgentPublicAccess({ route: "audio-to-text", targetPath: ":id/voice/transcribe" })
    @Post(":id/voice/transcribe")
    @UseInterceptors(FileInterceptor("file"))
    async transcribe(
        @Param("id") agentId: string,
        @UploadedFile() file: Express.Multer.File,
        @Playground() _playground: UserPlayground,
    ) {
        if (!file?.buffer) throw HttpErrorFactory.badRequest("请上传音频文件");
        return this.agentVoiceService.transcribe(agentId, file.buffer);
    }

    @AgentPublicAccess({ route: "text-to-audio", targetPath: ":id/voice/speech" })
    @Post(":id/voice/speech")
    async speech(
        @Param("id") agentId: string,
        @Body() dto: AgentSpeechRequestDto,
        @Playground() _playground: UserPlayground,
        @Res() res: Response,
    ) {
        const { audio, format } = await this.agentVoiceService.speech(agentId, dto.text, {
            modelId: dto.modelId,
            voice: dto.voice,
            speed: dto.speed,
            responseFormat:
                (dto.responseFormat as "mp3" | "opus" | "aac" | "flac" | "wav" | "pcm") ?? "mp3",
        });
        const mime =
            format === "mp3" ? "audio/mpeg" : format === "wav" ? "audio/wav" : "audio/mpeg";
        res.setHeader("Content-Type", mime);
        res.send(Buffer.from(audio));
    }

    @Post(":id/chat/conversations/:conversationId/messages/:messageId/feedback")
    @AgentPublicAccess({
        route: "messages/:conversationId/:messageId/feedback",
        targetPath: ":id/chat/conversations/:conversationId/messages/:messageId/feedback",
    })
    async addMessageFeedback(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Param("messageId") messageId: string,
        @Body() dto: CreateAgentMessageFeedbackDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权访问该对话");
        }
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权访问该对话");
        const msg = await this.agentChatMessageService.findOne({
            where: { id: messageId, conversationId },
        });
        if (!msg) throw HttpErrorFactory.notFound("消息不存在");
        return this.agentChatMessageFeedbackService.addFeedback({
            messageId,
            conversationId,
            userId: playground.id,
            type: dto.type,
            dislikeReason: dto.dislikeReason,
        });
    }

    @Delete(":id/chat/conversations/:conversationId/messages/:messageId/feedback")
    @AgentPublicAccess({
        route: "messages/:conversationId/:messageId/feedback",
        targetPath: ":id/chat/conversations/:conversationId/messages/:messageId/feedback",
        method: "DELETE",
    })
    async removeMessageLikeDislike(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Param("messageId") messageId: string,
        @Query("type") type: "like" | "dislike",
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权访问该对话");
        }
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权访问该对话");
        const msg = await this.agentChatMessageService.findOne({
            where: { id: messageId, conversationId },
        });
        if (!msg) throw HttpErrorFactory.notFound("消息不存在");
        if (type !== "like" && type !== "dislike") {
            throw HttpErrorFactory.badRequest("type 必须为 like 或 dislike");
        }
        await this.agentChatMessageFeedbackService.addFeedback({
            messageId,
            conversationId,
            userId: playground.id,
            type,
        });
    }

    @Get(":id/chat/conversations/:conversationId/messages/:messageId/feedbacks")
    async listMessageFeedbacks(
        @Param("id") _agentId: string,
        @Param("conversationId") conversationId: string,
        @Param("messageId") messageId: string,
    ) {
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        const msg = await this.agentChatMessageService.findOne({
            where: { id: messageId, conversationId },
        });
        if (!msg) throw HttpErrorFactory.notFound("消息不存在");
        return this.agentChatMessageFeedbackService.getFeedbacksByMessage(messageId);
    }

    @Get(":id/chat/conversations")
    @AgentPublicAccess({
        route: "conversations",
        targetPath: ":id/chat/conversations",
        method: "GET",
    })
    @BuildFileUrl(["**.userAvatar"])
    async listConversations(
        @Param("id") agentId: string,
        @Query() query: ListAgentConversationsDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ): Promise<PaginationResult<AgentChatRecordWithUser>> {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        return this.agentChatRecordService.listUserConversations(
            agentId,
            playground.id,
            query,
            anonymousIdentifier,
        );
    }

    @Get(":id/chat/conversations/:conversationId/messages")
    @AgentPublicAccess({
        route: "messages/:conversationId",
        targetPath: ":id/chat/conversations/:conversationId/messages",
        method: "GET",
    })
    async listConversationMessages(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Query() query: ListConversationMessagesDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ): Promise<PaginationResult<AgentChatMessage>> {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权查看该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权查看该对话");
        }
        return this.agentChatMessageService.listConversationMessages(
            conversationId,
            query,
            playground.id,
        );
    }

    /**
     * Stream live OpenCode session events for a running turn.
     * Used when the client re-focuses a detached conversation; polling stays as fallback.
     */
    @Get(":id/chat/conversations/:conversationId/opencode-session/events")
    @AgentPublicAccess({
        route: "conversations/:conversationId/opencode-session/events",
        targetPath: ":id/chat/conversations/:conversationId/opencode-session/events",
        method: "GET",
    })
    async streamOpencodeSessionEvents(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权查看该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权查看该对话");
        }
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("Only OpenCode agents expose session events");
        }
        const sessionId =
            typeof record.metadata === "object" && record.metadata
                ? (record.metadata as Record<string, unknown>).opencodeSessionId
                : undefined;
        if (typeof sessionId !== "string") {
            throw HttpErrorFactory.badRequest("Conversation has no OpenCode session");
        }

        const abortController = new AbortController();
        const abortSignal = abortController.signal;

        const handleDisconnect = () => {
            if (!abortSignal.aborted) abortController.abort();
        };
        req.on("close", handleDisconnect);
        req.on("aborted", handleDisconnect);
        res.on("close", handleDisconnect);

        res.status(200);
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");
        res.flushHeaders?.();

        // Heartbeat so intermediaries keep the connection open and the client
        // knows the stream is alive even when OpenCode is idle.
        const heartbeat = setInterval(() => {
            if (!res.writableEnded) {
                res.write(`: heartbeat\n\n`);
            }
        }, 15000);

        let ended = false;
        const writeEvent = (event: { type: string; properties?: Record<string, any> }) => {
            if (ended || res.writableEnded) return;
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        try {
            await this.opencodeApiService.streamEvents({
                config: agent.thirdPartyIntegration,
                signal: abortSignal,
                shouldStop: (event) => {
                    if (event.type === "session.idle") {
                        return event.properties?.sessionID === sessionId;
                    }
                    if (event.type === "session.error") {
                        return event.properties?.sessionID === sessionId;
                    }
                    return false;
                },
                onEvent: async (event) => {
                    const eventSessionId = event.properties?.sessionID as string | undefined;
                    if (eventSessionId && eventSessionId !== sessionId) return;

                    if (event.type === "message.updated") {
                        const info = event.properties?.info as Record<string, any> | undefined;
                        writeEvent({
                            type: "message.updated",
                            properties: {
                                info: {
                                    id: info?.id,
                                    role: info?.role,
                                    finish: info?.finish,
                                    error: info?.error,
                                },
                            },
                        });
                        return;
                    }

                    if (event.type === "question.asked" || event.type === "question.v2.asked") {
                        writeEvent({
                            type: event.type,
                            properties: event.properties,
                        });
                        return;
                    }

                    if (
                        event.type === "question.replied" ||
                        event.type === "question.rejected" ||
                        event.type === "question.v2.replied" ||
                        event.type === "question.v2.rejected"
                    ) {
                        writeEvent({
                            type: event.type,
                            properties: event.properties,
                        });
                        return;
                    }

                    if (event.type === "message.part.updated") {
                        const part = event.properties?.part as Record<string, any> | undefined;
                        if (!part) return;
                        writeEvent({
                            type: "message.part.updated",
                            properties: {
                                part: {
                                    id: part.id,
                                    messageID: part.messageID,
                                    type: part.type,
                                    text: part.text,
                                    tool: part.tool,
                                    state: part.state,
                                },
                            },
                        });
                        return;
                    }

                    if (event.type === "session.idle" || event.type === "session.error") {
                        writeEvent({
                            type: event.type,
                            properties: { sessionID: sessionId },
                        });
                        return;
                    }
                },
            });
        } catch (error) {
            if (!abortSignal.aborted) {
                const message =
                    error instanceof Error ? error.message : "OpenCode event stream failed";
                writeEvent({
                    type: "session.error",
                    properties: { sessionID: sessionId, error: message },
                });
            }
        } finally {
            clearInterval(heartbeat);
            if (!ended && !res.writableEnded) {
                res.end();
            }
            ended = true;
        }
    }

    @Get(":id/chat/conversations/:conversationId/opencode-session/messages")
    @AgentPublicAccess({
        route: "conversations/:conversationId/opencode-session/messages",
        targetPath: ":id/chat/conversations/:conversationId/opencode-session/messages",
        method: "GET",
    })
    async listOpencodeSessionMessages(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ): Promise<{
        sessionId: string | undefined;
        messages: Array<Record<string, any>>;
    }> {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权查看该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权查看该对话");
        }
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("Only OpenCode agents expose session messages");
        }
        const sessionId =
            typeof record.metadata === "object" && record.metadata
                ? (record.metadata as Record<string, unknown>).opencodeSessionId
                : undefined;
        if (typeof sessionId !== "string") {
            return { sessionId: undefined, messages: [] };
        }
        const messages = await this.opencodeApiService.listSessionMessages({
            config: agent.thirdPartyIntegration,
            sessionId,
        });
        return { sessionId, messages };
    }

    @Post(":id/chat/conversations/:conversationId/stop")
    @AgentPublicAccess({
        route: "conversations/:conversationId/stop",
        targetPath: ":id/chat/conversations/:conversationId/stop",
        method: "POST",
    })
    async stopConversationTurn(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权操作该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权操作该对话");
        }
        const activeTurn = await this.agentChatRecordService.findActiveOpencodeTurn(conversationId);
        if (activeTurn) {
            throw HttpErrorFactory.conflict(
                `OpenCode turn ${activeTurn.id} requires the turn-scoped Stop endpoint`,
            );
        }
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("Stop is only supported for OpenCode agents");
        }
        return this.opencodeChatProvider.stopTurn(conversationId, agent);
    }

    @Patch(":id/chat/conversations/:conversationId")
    @AgentPublicAccess({
        route: "conversations/:conversationId",
        targetPath: ":id/chat/conversations/:conversationId",
        method: "PATCH",
    })
    async updateConversation(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Body("title") title: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权修改该对话");
        }
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权修改该对话");
        if (!title?.trim()) throw HttpErrorFactory.badRequest("标题不能为空");
        await this.agentChatRecordService.updateTitle(conversationId, title.trim());
        return { message: "对话已更新" };
    }

    @Delete(":id/chat/conversations/:conversationId")
    async deleteConversation(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
    ) {
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权删除该对话");
        await this.agentChatRecordService.softDelete(conversationId, playground.id);
        return { message: "对话已删除" };
    }

    @Patch(":id/chat/conversations/:conversationId/archive")
    @AgentPublicAccess({
        route: "conversations/:conversationId/archive",
        targetPath: ":id/chat/conversations/:conversationId/archive",
        method: "PATCH",
    })
    async archiveConversation(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Body() dto: ArchiveConversationDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权归档该对话");
        }
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权归档该对话");
        await this.agentChatRecordService.archive(conversationId, playground.id, dto.archived);
        return { message: dto.archived ? "对话已归档" : "对话已取消归档" };
    }

    @Get(":id/chat/conversations/:conversationId")
    @AgentPublicAccess({
        route: "conversations/:conversationId",
        targetPath: ":id/chat/conversations/:conversationId",
        method: "GET",
    })
    async getConversationDetail(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) throw HttpErrorFactory.notFound("对话不存在");
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权查看该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权查看该对话");
        }
        const agent = await this.agentsService.findOneById(agentId);
        const sessionId =
            typeof record.metadata === "object" && record.metadata
                ? (record.metadata as Record<string, unknown>).opencodeSessionId
                : undefined;
        if (agent?.createMode === "opencode" && typeof sessionId === "string") {
            try {
                const question = (
                    await this.opencodeApiService.listPendingQuestions({
                        config: agent.thirdPartyIntegration,
                        sessionId,
                        timeoutMs: 2_000,
                    })
                )[0];
                const pending = question
                    ? {
                          requestId: question.id,
                          sessionId: question.sessionID,
                          questions: question.questions,
                      }
                    : null;
                await this.agentChatRecordService.updateMetadata(conversationId, {
                    opencodePendingQuestion: pending,
                });
                record.metadata = { ...(record.metadata ?? {}), opencodePendingQuestion: pending };
            } catch {
                // Persisted question metadata remains usable when OpenCode is temporarily unavailable.
            }
        }
        const turnProjection =
            await this.agentChatRecordService.getOpencodeTurnConversationProjection(conversationId);
        return {
            id: record.id,
            title: record.title,
            archivedAt: record.archivedAt ?? null,
            metadata: turnProjection.legacyStatus
                ? {
                      ...(record.metadata ?? {}),
                      opencodeTurnStatus: turnProjection.legacyStatus,
                  }
                : record.metadata,
            activeTurn: turnProjection.activeTurn,
        };
    }

    @Get(":id/chat/conversations/:conversationId/opencode-embed")
    @AgentPublicAccess({
        route: "conversations/:conversationId/opencode-embed",
        targetPath: ":id/chat/conversations/:conversationId/opencode-embed",
        method: "GET",
    })
    async getOpencodeEmbed(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ): Promise<{
        conversationId: string;
        sessionId: string;
        url: string;
        title: string;
        titleSynced: boolean;
    }> {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode") {
            throw HttpErrorFactory.badRequest("Only OpenCode agents support iframe embedding");
        }

        let record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record) {
            if (!isUUID(conversationId)) throw HttpErrorFactory.notFound("对话不存在");
            try {
                record = await this.agentChatRecordService.createConversation({
                    id: conversationId,
                    agentId,
                    userId: playground.id,
                    anonymousIdentifier,
                    metadata: {
                        provider: "opencode",
                        bowiAuthSource: this.resolveAuthSource(req, anonymousIdentifier),
                    },
                });
            } catch {
                record = await this.agentChatRecordService.getConversation(conversationId);
                if (!record) throw HttpErrorFactory.conflict("无法初始化 OpenCode 对话");
            }
        }
        if (record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id) throw HttpErrorFactory.forbidden("无权查看该对话");
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden("无权查看该对话");
        }
        const runtime = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);
        const artifactRoot = resolveArtifactRoot({
            workspace: runtime.workspace,
            conversationId,
            artifactDirTemplate: runtime.artifactDirTemplate,
        });
        const artifactRelativeRoot = path
            .relative(runtime.workspace, artifactRoot)
            .split(path.sep)
            .join("/");
        const reportSystemHint = buildOpencodeArtifactSystemHint({
            conversationId,
            artifactRoot,
        });
        const webOrigin = resolveBuildingAIWebOrigin({
            origin: typeof req.headers.origin === "string" ? req.headers.origin : undefined,
            referer: typeof req.headers.referer === "string" ? req.headers.referer : undefined,
            configuredWebOrigin: process.env.VITE_CLIENT_WEB_URL,
        });
        const reportBase = buildBuildingAIReportBase(webOrigin, agentId, conversationId);
        let sessionId = record.opencodeSessionId;
        if (!sessionId && typeof record.metadata?.opencodeSessionId === "string") {
            sessionId = record.metadata.opencodeSessionId;
        }
        let createdSessionId: string | undefined;
        let sessionSystemContext: string | undefined;
        if (!sessionId) {
            const personalParams = await this.userDictService.getGroupValues(
                playground.id,
                "personalParams",
            );
            const personalContext = buildOpencodeSessionContext({
                userId: playground.id,
                username: playground.username,
                personalParams,
                sensitiveWordConfig: agent.sensitiveWordConfig,
                agentId,
            });
            sessionSystemContext = [personalContext, reportSystemHint].filter(Boolean).join("\n\n");
            const session = await this.opencodeApiService.createSession(
                agent.thirdPartyIntegration,
                this.agentChatRecordService.isPlaceholderConversationTitle(record.title)
                    ? undefined
                    : record.title,
                sessionSystemContext
                    ? {
                          useDefaultTitle:
                              this.agentChatRecordService.isPlaceholderConversationTitle(
                                  record.title,
                              ),
                          metadata: {
                              [OPENCODE_BUILDINGAI_CONTEXT_METADATA_KEY]: sessionSystemContext,
                          },
                      }
                    : {
                          useDefaultTitle:
                              this.agentChatRecordService.isPlaceholderConversationTitle(
                                  record.title,
                              ),
                      },
            );
            sessionId = session.id;
            createdSessionId = session.id;
            const bound = await this.agentChatRecordService.bindOpencodeSession(
                conversationId,
                sessionId,
                hashOpencodeRuntime(runtime),
            );
            if (bound?.opencodeSessionId && bound.opencodeSessionId !== sessionId) {
                await this.opencodeApiService.deleteSession({
                    config: agent.thirdPartyIntegration,
                    sessionId,
                });
                sessionId = bound.opencodeSessionId;
            }
        } else if (!record.opencodeSessionId || !record.opencodeRuntimeHash) {
            const bound = await this.agentChatRecordService.bindOpencodeSession(
                conversationId,
                sessionId,
                hashOpencodeRuntime(runtime),
            );
            if (bound?.opencodeSessionId) sessionId = bound.opencodeSessionId;
        }

        if (sessionId && sessionId !== createdSessionId) {
            this.enqueueOpencodeSessionMetadataRefresh({
                agentId,
                agentConfig: agent.thirdPartyIntegration,
                agentSensitiveWordConfig: agent.sensitiveWordConfig,
                conversationId,
                opencodeSessionId: sessionId,
                reportSystemHint,
                userId: playground.id,
                username: playground.username,
            });
        }

        let title = record.title;
        let titleSynced = false;
        if (this.agentChatRecordService.isPlaceholderConversationTitle(record.title)) {
            this.enqueueOpencodeTitleSync({
                config: agent.thirdPartyIntegration,
                conversationId,
                sessionId,
            });
        }

        await this.agentChatRecordService.initializeOpencodeIframeBilling(conversationId);

        return {
            conversationId,
            sessionId,
            url: buildOpencodeEmbedUrl(runtime.baseURL, sessionId, {
                reportBase,
                artifactRoot: artifactRelativeRoot,
            }),
            title,
            titleSynced,
        };
    }

    private enqueueOpencodeSessionMetadataRefresh(params: {
        agentId: string;
        agentConfig: ThirdPartyIntegrationConfig | null | undefined;
        agentSensitiveWordConfig: SensitiveWordConfig | null | undefined;
        conversationId: string;
        opencodeSessionId: string;
        reportSystemHint: string;
        userId: string;
        username?: string | null;
    }): void {
        const key = `${params.conversationId}:${params.opencodeSessionId}`;
        if (this.pendingOpencodeMetadataRefreshes.has(key)) return;
        this.pendingOpencodeMetadataRefreshes.add(key);

        void (async () => {
            try {
                const personalContext = buildOpencodeSessionContext({
                    userId: params.userId,
                    username: params.username,
                    personalParams: await this.userDictService.getGroupValues(
                        params.userId,
                        "personalParams",
                    ),
                    sensitiveWordConfig: params.agentSensitiveWordConfig,
                    agentId: params.agentId,
                });
                const sessionSystemContext = [personalContext, params.reportSystemHint]
                    .filter(Boolean)
                    .join("\n\n");
                await this.opencodeApiService.updateSessionMetadata({
                    config: params.agentConfig,
                    sessionId: params.opencodeSessionId,
                    metadata: {
                        [OPENCODE_BUILDINGAI_CONTEXT_METADATA_KEY]: sessionSystemContext,
                    },
                    timeoutMs: 2_000,
                });
            } catch {
                // Keep an existing conversation available when an older runtime cannot refresh metadata.
            } finally {
                this.pendingOpencodeMetadataRefreshes.delete(key);
            }
        })();
    }

    private enqueueOpencodeTitleSync(params: {
        config: ThirdPartyIntegrationConfig | null | undefined;
        conversationId: string;
        sessionId: string;
    }): void {
        const key = `${params.conversationId}:${params.sessionId}`;
        if (this.pendingOpencodeTitleSyncs.has(key)) return;
        this.pendingOpencodeTitleSyncs.add(key);

        void (async () => {
            try {
                const session = await this.opencodeApiService.getSession({
                    config: params.config,
                    sessionId: params.sessionId,
                    timeoutMs: 2_000,
                });
                await this.agentChatRecordService.syncGeneratedOpencodeTitle(
                    params.conversationId,
                    session.title,
                );
            } catch {
                // Keep embed access available while OpenCode title generation is unavailable.
            } finally {
                this.pendingOpencodeTitleSyncs.delete(key);
            }
        })();
    }

    @Post(":id/chat/conversations/:conversationId/opencode-question/reply")
    @AgentPublicAccess({
        route: "conversations/:conversationId/opencode-question/reply",
        targetPath: ":id/chat/conversations/:conversationId/opencode-question/reply",
        method: "POST",
    })
    async replyLegacyOpencodeQuestion(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Body() dto: OpencodeQuestionReplyDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const record = await this.getOwnedConversation(
            agentId,
            conversationId,
            playground,
            req,
            "操作",
        );
        const pending = record.metadata?.opencodePendingQuestion as
            | Record<string, unknown>
            | undefined;
        if (!pending || pending.requestId !== dto.requestId)
            throw HttpErrorFactory.conflict("问题已过期");
        const sessionId = record.metadata?.opencodeSessionId;
        if (typeof sessionId !== "string") throw HttpErrorFactory.conflict("会话已结束");
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode")
            throw HttpErrorFactory.badRequest("Only OpenCode agents support questions");
        await this.opencodeApiService.replyQuestion({
            config: agent.thirdPartyIntegration,
            requestId: dto.requestId,
            sessionId,
            answers: dto.answers,
        });
        await this.agentChatRecordService.updateMetadata(conversationId, {
            opencodePendingQuestion: null,
        });
        return { ok: true };
    }

    @Post(":id/chat/conversations/:conversationId/opencode-question/reject")
    @AgentPublicAccess({
        route: "conversations/:conversationId/opencode-question/reject",
        targetPath: ":id/chat/conversations/:conversationId/opencode-question/reject",
        method: "POST",
    })
    async rejectLegacyOpencodeQuestion(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Body() dto: OpencodeQuestionRejectDto,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
    ) {
        const record = await this.getOwnedConversation(
            agentId,
            conversationId,
            playground,
            req,
            "操作",
        );
        const pending = record.metadata?.opencodePendingQuestion as
            | Record<string, unknown>
            | undefined;
        if (!pending || pending.requestId !== dto.requestId)
            throw HttpErrorFactory.conflict("问题已过期");
        const sessionId = record.metadata?.opencodeSessionId;
        if (typeof sessionId !== "string") throw HttpErrorFactory.conflict("会话已结束");
        const agent = await this.agentsService.findOneById(agentId);
        if (!agent || agent.createMode !== "opencode")
            throw HttpErrorFactory.badRequest("Only OpenCode agents support questions");
        await this.opencodeApiService.rejectQuestion({
            config: agent.thirdPartyIntegration,
            requestId: dto.requestId,
            sessionId,
        });
        await this.agentChatRecordService.updateMetadata(conversationId, {
            opencodePendingQuestion: null,
        });
        return { ok: true };
    }

    @Post(":id/chat/conversations/:conversationId/messages/operator")
    async createOperatorMessage(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Body() dto: CreateOperatorMessageDto,
        @Playground() playground: UserPlayground,
    ): Promise<AgentChatMessage> {
        const agent = await this.agentsService.getAgentByIdOrThrow(agentId);
        if (agent.createBy !== playground.id) {
            throw HttpErrorFactory.forbidden("无权限操作该智能体");
        }
        return this.agentChatRecordService.createOperatorReply({
            agentId,
            conversationId,
            content: dto.content,
            operatorId: playground.id,
            operatorName: playground.username,
        });
    }

    private async getOwnedConversation(
        agentId: string,
        conversationId: string,
        playground: UserPlayground,
        req: Request,
        action: string,
    ) {
        const record = await this.agentChatRecordService.getConversation(conversationId);
        if (!record || record.agentId !== agentId) throw HttpErrorFactory.notFound("对话不存在");
        if (record.userId !== playground.id)
            throw HttpErrorFactory.forbidden(`无权${action}该对话`);
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        if (anonymousIdentifier && record.anonymousIdentifier !== anonymousIdentifier) {
            throw HttpErrorFactory.forbidden(`无权${action}该对话`);
        }
        return record;
    }

    /**
     * Serve OpenCode L2 HTML/report artifacts for a conversation (iframe preview).
     * Example: GET /ai-agents/:id/conversations/:conversationId/artifacts/index.html
     */
    @Get(":id/conversations/:conversationId/artifacts/*")
    @AgentPublicAccess({
        route: "artifacts/:conversationId/*",
        targetPath: ":id/conversations/:conversationId/artifacts/*",
        method: "GET",
    })
    async getConversationArtifact(
        @Param("id") agentId: string,
        @Param("conversationId") conversationId: string,
        @Playground() playground: UserPlayground,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const anonymousIdentifier = this.extractAnonymousIdentifier(req);
        const marker = `/artifacts/`;
        const urlPath = (req.originalUrl || req.url || "").split("?")[0] ?? "";
        const markerIndex = urlPath.lastIndexOf(marker);
        const relativePath =
            markerIndex >= 0 ? decodeURIComponent(urlPath.slice(markerIndex + marker.length)) : "";
        if (!relativePath) {
            throw HttpErrorFactory.badRequest("产物路径不能为空");
        }

        const file = await this.opencodeArtifactService.openArtifactFile({
            agentId,
            conversationId,
            userId: playground.id,
            anonymousIdentifier,
            relativePath,
        });

        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Length", String(file.size));
        res.setHeader("Cache-Control", "private, max-age=60");
        res.setHeader("X-Content-Type-Options", "nosniff");
        file.stream.pipe(res);
    }

    private extractAnonymousIdentifier(req: Request): string | undefined {
        const v = req.headers["x-anonymous-identifier"];
        if (typeof v !== "string") return undefined;
        const trimmed = v.trim();
        return trimmed || undefined;
    }

    private resolveAuthSource(req: Request, anonymousIdentifier?: string): RequestAuthSource {
        if (anonymousIdentifier) return "anonymous";
        return getRequestAuthContext(req)?.source ?? "anonymous";
    }

    private resolveFeishuIdentity(
        req: Request,
        agentId: string,
        anonymousIdentifier?: string,
    ) {
        if (!anonymousIdentifier?.startsWith("feishu:")) return undefined;
        const value = req.headers["x-buildingai-feishu-identity"];
        return resolveFeishuIdentityAssertion(
            Array.isArray(value) ? value[0] : value,
            agentId,
        );
    }
}
