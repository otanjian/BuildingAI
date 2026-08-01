import { extractTextFromParts } from "@buildingai/ai-sdk/utils/token-usage";
import type { Agent } from "@buildingai/db/entities";
import { HttpErrorFactory } from "@buildingai/errors";
import type { ChatMessageUsage, ChatUIMessage } from "@buildingai/types";
import { AgentConfigService } from "@modules/config/services/agent-config.service";
import { Injectable, Logger } from "@nestjs/common";
import {
    createUIMessageStream,
    generateId,
    pipeUIMessageStreamToResponse,
    type UIMessage,
} from "ai";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ServerResponse } from "http";
import { validate as isUUID } from "uuid";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { OpencodeApiService } from "../integrations/opencode-api.service";
import type { AgentChatCompletionParams } from "../services/agent-chat-completion.service";
import { AgentChatMessageService } from "../services/agent-chat-message.service";
import { AgentChatRecordService } from "../services/agent-chat-record.service";
import {
    isHtmlArtifactPath,
    preferredHtmlEntryRelativePath,
    resolveArtifactRoot,
} from "../utils/opencode-artifact-path";
import { OpencodeAssistantPartRouter } from "../utils/opencode-part-router";
import {
    convertFilePartsToDataUrls,
    mapUiPartsToOpencodePromptParts,
    OpencodeAttachmentForwardError,
    type UiMessagePartLike,
} from "../utils/opencode-prompt-parts";
import { OpencodeTokenUsageAccumulator } from "../utils/opencode-token-usage";

type ProviderWriter = {
    write: (part: Record<string, any>) => void;
};

type DynamicToolPart = {
    type: "dynamic-tool";
    toolCallId: string;
    toolName: string;
    state: "input-available" | "output-available" | "output-error";
    input: Record<string, any>;
    output?: unknown;
    errorText?: string;
};

type HtmlArtifact = {
    kind: "html";
    title: string;
    relativePath: string;
    url: string;
};

const MAX_TOOL_OUTPUT_CHARS = 8_000;

/**
 * OpenCode agent chat provider — BuildingAI owns UI/history; OpenCode owns execution.
 */
@Injectable()
export class OpencodeChatProvider {
    private readonly logger = new Logger(OpencodeChatProvider.name);

    constructor(
        private readonly opencodeApiService: OpencodeApiService,
        private readonly agentChatRecordService: AgentChatRecordService,
        private readonly agentChatMessageService: AgentChatMessageService,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly agentConfigService: AgentConfigService,
    ) {}

    async streamChat(
        agent: Agent,
        params: AgentChatCompletionParams,
        response: ServerResponse,
    ): Promise<void> {
        if (!this.opencodeApiService.hasValidConfig(agent.thirdPartyIntegration)) {
            throw HttpErrorFactory.badRequest("OpenCode Agent 未配置有效的 baseURL / workspace");
        }

        const saveConversation = params.saveConversation !== false;
        let localConversationId = saveConversation
            ? await this.resolveLocalConversationId(params)
            : undefined;
        const lastUserMessage = params.messages.findLast((message) => message.role === "user");
        const initialTitle = lastUserMessage
            ? extractTextFromParts(lastUserMessage.parts ?? []).fullText
            : "";

        if (saveConversation && !localConversationId) {
            const record = await this.agentChatRecordService.createConversation({
                agentId: params.agentId,
                userId: params.userId,
                anonymousIdentifier: params.anonymousIdentifier,
                title: initialTitle,
                metadata: params.isDebug ? { isDebug: true, provider: "opencode" } : { provider: "opencode" },
            });
            localConversationId = record.id;
        }

        const stream = createUIMessageStream({
            execute: async ({ writer }) => {
                if (localConversationId) {
                    writer.write({
                        type: "data-conversation-id",
                        data: localConversationId,
                        transient: true,
                    } as any);
                }

                const assistantMessageId = generateId();
                writer.write({ type: "start", messageId: assistantMessageId });
                writer.write({ type: "start-step" });

                const partRouter = new OpencodeAssistantPartRouter();
                const tokenUsage = new OpencodeTokenUsageAccumulator();
                const toolParts = new Map<string, DynamicToolPart>();
                const emittedToolInputIds = new Set<string>();
                /** OpenCode messageID -> role (ignore user/system text echo) */
                const messageRoles = new Map<string, string>();
                let htmlArtifact: HtmlArtifact | undefined;

                const billingRule = await this.getBillingRule();
                const shouldCharge = params.isDebug !== true;
                if (shouldCharge && params.userId && billingRule) {
                    await this.agentBillingHandler.validateUserPower(params.userId, billingRule);
                }

                const writeChunks = (chunks: ReturnType<OpencodeAssistantPartRouter["onDelta"]>) => {
                    for (const chunk of chunks) {
                        writer.write(chunk as any);
                    }
                };

                let mappedPrompt: ReturnType<typeof mapUiPartsToOpencodePromptParts>;
                try {
                    mappedPrompt = mapUiPartsToOpencodePromptParts(
                        (lastUserMessage?.parts ?? []) as UiMessagePartLike[],
                        { appDomain: process.env.APP_DOMAIN },
                    );
                } catch (error) {
                    if (error instanceof OpencodeAttachmentForwardError) {
                        throw HttpErrorFactory.badRequest(error.message);
                    }
                    throw error;
                }

                // Convert http(s):// image URLs to base64 data URLs for OpenCode
                try {
                    mappedPrompt.parts = await convertFilePartsToDataUrls(mappedPrompt.parts);
                } catch (error) {
                    if (error instanceof OpencodeAttachmentForwardError) {
                        throw HttpErrorFactory.badRequest(error.message);
                    }
                    throw error;
                }
                const userText = mappedPrompt.text;

                const config = this.opencodeApiService.normalizeConfig(agent.thirdPartyIntegration);
                if (!localConversationId) {
                    throw HttpErrorFactory.badRequest("OpenCode 需要本地会话以进行产物隔离");
                }

                const artifactRoot = resolveArtifactRoot({
                    workspace: config.workspace,
                    conversationId: localConversationId,
                    artifactDirTemplate: config.artifactDirTemplate,
                });
                await fs.mkdir(artifactRoot, { recursive: true });
                const preExistingHtmlFiles = await this.snapshotHtmlFiles(artifactRoot);

                let opencodeSessionId = await this.resolveRemoteSessionId(localConversationId);
                if (!opencodeSessionId) {
                    const session = await this.opencodeApiService.createSession(
                        agent.thirdPartyIntegration,
                        initialTitle || "BuildingAI conversation",
                    );
                    opencodeSessionId = session.id;
                    await this.agentChatRecordService.updateMetadata(localConversationId, {
                        provider: "opencode",
                        opencodeSessionId,
                        artifactRoot,
                    });
                }

                const systemHint = [
                    "You are running as a BuildingAI OpenCode agent.",
                    `Conversation id: ${localConversationId}`,
                    `Write report/dashboard HTML artifacts ONLY under: ${artifactRoot}`,
                    "Do not write HTML reports into other conversations' artifact directories.",
                ].join("\n");

                const turnAbort = new AbortController();
                const onClientAbort = () => {
                    if (!turnAbort.signal.aborted) turnAbort.abort();
                };
                if (params.abortSignal) {
                    if (params.abortSignal.aborted) onClientAbort();
                    else params.abortSignal.addEventListener("abort", onClientAbort, { once: true });
                }

                let turnIdle = false;
                let streamError: string | undefined;
                let settleTurn: (() => void) | undefined;
                const turnDone = new Promise<void>((resolve) => {
                    settleTurn = resolve;
                });
                const finishTurn = () => {
                    if (turnIdle) return;
                    turnIdle = true;
                    settleTurn?.();
                    if (!turnAbort.signal.aborted) turnAbort.abort();
                };

                const eventLoop = this.opencodeApiService.streamEvents({
                    config: agent.thirdPartyIntegration,
                    signal: turnAbort.signal,
                    shouldStop: (event) => {
                        if (event.type === "session.idle") {
                            return event.properties?.sessionID === opencodeSessionId;
                        }
                        if (event.type === "session.error") {
                            return event.properties?.sessionID === opencodeSessionId;
                        }
                        return false;
                    },
                    onEvent: async (event) => {
                        const sessionID = event.properties?.sessionID as string | undefined;
                        if (sessionID && sessionID !== opencodeSessionId) {
                            return;
                        }

                        if (event.type === "message.updated") {
                            const info = event.properties?.info as Record<string, any> | undefined;
                            if (info?.id && info?.role) {
                                messageRoles.set(String(info.id), String(info.role));
                            }
                            if (info) {
                                tokenUsage.observeMessageUpdated(info);
                            }
                            return;
                        }

                        if (event.type === "session.error") {
                            const err = event.properties?.error;
                            streamError = this.formatSessionError(err);
                            finishTurn();
                            return;
                        }

                        if (event.type === "session.idle" && sessionID === opencodeSessionId) {
                            finishTurn();
                            return;
                        }

                        if (event.type === "message.part.delta") {
                            const messageID = String(event.properties?.messageID ?? "");
                            writeChunks(
                                partRouter.onDelta({
                                    messageRole: messageRoles.get(messageID),
                                    partID: String(event.properties?.partID ?? ""),
                                    field: event.properties?.field,
                                    delta: event.properties?.delta,
                                }),
                            );
                            return;
                        }

                        if (event.type === "file.edited") {
                            const file = event.properties?.file;
                            if (typeof file === "string" && isHtmlArtifactPath(file, artifactRoot)) {
                                htmlArtifact = await this.buildHtmlArtifact({
                                    agentId: params.agentId,
                                    conversationId: localConversationId!,
                                    artifactRoot,
                                    absolutePath: file,
                                });
                                if (htmlArtifact) {
                                    writer.write({
                                        type: "data-artifact",
                                        data: htmlArtifact,
                                    } as any);
                                }
                            }
                            return;
                        }

                        if (event.type === "message.part.updated") {
                            const part = event.properties?.part as Record<string, any> | undefined;
                            if (!part || part.sessionID !== opencodeSessionId) return;
                            const messageID = String(part.messageID ?? "");
                            const role = messageRoles.get(messageID);

                            if (part.type === "step-finish") {
                                tokenUsage.observeStepFinishPart(part);
                                return;
                            }

                            if (part.type === "tool") {
                                if (role && role !== "assistant") return;
                                partRouter.registerPartType(String(part.id ?? ""), "tool");
                                this.emitToolPart({
                                    part,
                                    writer,
                                    toolParts,
                                    emittedToolInputIds,
                                    artifactRoot,
                                    agentId: params.agentId,
                                    conversationId: localConversationId!,
                                    onHtmlArtifact: (artifact) => {
                                        htmlArtifact = artifact;
                                        writer.write({
                                            type: "data-artifact",
                                            data: artifact,
                                        } as any);
                                    },
                                });
                                return;
                            }

                            // Only stream assistant text/reasoning; user prompt parts caused UI echo.
                            writeChunks(
                                partRouter.onTextOrReasoningUpdated({
                                    messageRole: role,
                                    part: {
                                        id: String(part.id ?? ""),
                                        type: String(part.type ?? ""),
                                        text: typeof part.text === "string" ? part.text : undefined,
                                        messageID,
                                        time: part.time,
                                    },
                                }),
                            );
                        }
                    },
                });

                const eventPromise = eventLoop.catch((error) => {
                    if (!turnAbort.signal.aborted) {
                        this.logger.warn(
                            `OpenCode event loop ended: ${error instanceof Error ? error.message : String(error)}`,
                        );
                    }
                });

                await this.opencodeApiService.promptAsync({
                    config: agent.thirdPartyIntegration,
                    sessionId: opencodeSessionId,
                    text: userText,
                    parts: mappedPrompt.parts as Array<Record<string, unknown>>,
                    system: systemHint,
                    model: config.model,
                });

                const maxWaitMs = 15 * 60 * 1000;
                await Promise.race([
                    turnDone,
                    new Promise<void>((resolve) => {
                        setTimeout(() => {
                            if (!turnIdle) {
                                streamError = "OpenCode turn timed out";
                                finishTurn();
                            }
                            resolve();
                        }, maxWaitMs);
                    }),
                ]);

                if (params.abortSignal?.aborted) {
                    await this.opencodeApiService.abortSession({
                        config: agent.thirdPartyIntegration,
                        sessionId: opencodeSessionId,
                    });
                }

                await Promise.race([
                    eventPromise,
                    new Promise((resolve) => setTimeout(resolve, 500)),
                ]);

                if (!htmlArtifact) {
                    htmlArtifact = await this.detectHtmlArtifact({
                        agentId: params.agentId,
                        conversationId: localConversationId,
                        artifactRoot,
                        exclude: preExistingHtmlFiles,
                    });
                    if (htmlArtifact) {
                        writer.write({
                            type: "data-artifact",
                            data: htmlArtifact,
                        } as any);
                    }
                }

                if (streamError) {
                    writeChunks(
                        partRouter.appendErrorText(`OpenCode error: ${streamError}`),
                    );
                }

                writeChunks(partRouter.endOpenReasoning());
                writeChunks(partRouter.ensureTextClosed());
                writer.write({ type: "finish-step" });
                writer.write({
                    type: "finish",
                    finishReason: params.abortSignal?.aborted
                        ? "stop"
                        : streamError
                          ? "error"
                          : "stop",
                });

                const usage = tokenUsage.finalize();
                let userConsumedPower = 0;
                if (
                    shouldCharge &&
                    saveConversation &&
                    localConversationId &&
                    params.userId &&
                    billingRule &&
                    (usage.totalTokens ?? 0) > 0
                ) {
                    userConsumedPower = await this.agentBillingHandler.deduct({
                        userId: params.userId,
                        conversationId: localConversationId,
                        agentId: params.agentId,
                        usage,
                        billingRule,
                    });
                }

                writer.write({
                    type: "data-usage",
                    data: {
                        inputTokens: usage.inputTokens ?? 0,
                        outputTokens: usage.outputTokens ?? 0,
                        totalTokens: usage.totalTokens ?? 0,
                        inputTokenDetails: usage.inputTokenDetails,
                        outputTokenDetails: usage.outputTokenDetails,
                        reasoningTokens: usage.reasoningTokens,
                        cachedInputTokens: usage.cachedInputTokens,
                        raw: usage.raw,
                        userConsumedPower,
                    },
                });

                const toolCallParts = Array.from(toolParts.values());
                const reasoningParts = partRouter.getPersistedReasoningParts();
                const responseParts: any[] = [...reasoningParts, ...toolCallParts];
                if (
                    partRouter.fullText ||
                    (toolCallParts.length === 0 && reasoningParts.length === 0)
                ) {
                    responseParts.push({ type: "text", text: partRouter.fullText });
                }
                if (htmlArtifact) {
                    responseParts.push({
                        type: "data-artifact",
                        data: htmlArtifact,
                    });
                }

                const responseMessage: UIMessage = {
                    id: assistantMessageId,
                    role: "assistant",
                    parts: responseParts as UIMessage["parts"],
                };

                await this.agentChatRecordService.updateMetadata(localConversationId, {
                    provider: "opencode",
                    opencodeSessionId,
                    artifactRoot,
                    lastHtmlArtifact: htmlArtifact,
                });

                await this.saveMessages({
                    conversationId: localConversationId,
                    params,
                    writer,
                    lastUser: lastUserMessage,
                    responseMessage,
                    usage,
                    userConsumedPower,
                    metadata: {
                        provider: "opencode",
                        opencodeSessionId,
                        artifactRoot,
                        htmlArtifact,
                        toolCalls: toolCallParts,
                    },
                });
            },
            onError: (error) => {
                const message = error instanceof Error ? error.message : String(error);
                this.logger.error(`OpenCode chat stream error: ${message}`);
                return message;
            },
        });

        pipeUIMessageStreamToResponse({ stream, response });
    }

    private async resolveLocalConversationId(
        params: AgentChatCompletionParams,
    ): Promise<string | undefined> {
        const requestedConversationId = params.conversationId;
        if (!requestedConversationId) return undefined;
        if (isUUID(requestedConversationId)) return requestedConversationId;
        return undefined;
    }

    private async resolveRemoteSessionId(localConversationId: string): Promise<string | undefined> {
        const record = await this.agentChatRecordService.getConversation(localConversationId);
        const sessionId = record?.metadata?.opencodeSessionId;
        return typeof sessionId === "string" ? sessionId : undefined;
    }

    private emitToolPart(params: {
        part: Record<string, any>;
        writer: ProviderWriter;
        toolParts: Map<string, DynamicToolPart>;
        emittedToolInputIds: Set<string>;
        artifactRoot: string;
        agentId: string;
        conversationId: string;
        onHtmlArtifact: (artifact: HtmlArtifact) => void;
    }): void {
        const { part, writer, toolParts, emittedToolInputIds } = params;
        const toolCallId = String(part.callID || part.id || generateId());
        const toolName = String(part.tool || "tool");
        const state = part.state as Record<string, any> | undefined;
        const status = String(state?.status ?? "pending");
        const input = (state?.input && typeof state.input === "object" ? state.input : {}) as Record<
            string,
            any
        >;

        if (!emittedToolInputIds.has(toolCallId)) {
            emittedToolInputIds.add(toolCallId);
            writer.write({
                type: "tool-input-available",
                toolCallId,
                toolName,
                input,
                dynamic: true,
            } as any);
            toolParts.set(toolCallId, {
                type: "dynamic-tool",
                toolCallId,
                toolName,
                state: "input-available",
                input,
            });
        }

        if (status === "completed") {
            const output = this.truncate(String(state?.output ?? state?.title ?? "ok"));
            writer.write({
                type: "tool-output-available",
                toolCallId,
                output,
                dynamic: true,
            } as any);
            toolParts.set(toolCallId, {
                type: "dynamic-tool",
                toolCallId,
                toolName,
                state: "output-available",
                input,
                output,
            });

            const filePath =
                typeof input.filePath === "string"
                    ? input.filePath
                    : typeof input.path === "string"
                      ? input.path
                      : typeof input.file === "string"
                        ? input.file
                        : undefined;
            if (filePath && isHtmlArtifactPath(filePath, params.artifactRoot)) {
                void this.buildHtmlArtifact({
                    agentId: params.agentId,
                    conversationId: params.conversationId,
                    artifactRoot: params.artifactRoot,
                    absolutePath: filePath,
                }).then((artifact) => {
                    if (artifact) params.onHtmlArtifact(artifact);
                });
            }
        }

        if (status === "error") {
            const errorText = this.truncate(String(state?.error ?? "OpenCode tool error"));
            writer.write({
                type: "tool-output-error",
                toolCallId,
                errorText,
                dynamic: true,
            } as any);
            toolParts.set(toolCallId, {
                type: "dynamic-tool",
                toolCallId,
                toolName,
                state: "output-error",
                input,
                errorText,
            });
        }
    }

    private async buildHtmlArtifact(params: {
        agentId: string;
        conversationId: string;
        artifactRoot: string;
        absolutePath: string;
    }): Promise<HtmlArtifact | undefined> {
        const absolute = path.resolve(params.absolutePath);
        const relativePath = path.relative(params.artifactRoot, absolute).split(path.sep).join("/");
        if (relativePath.startsWith("..")) return undefined;
        return {
            kind: "html",
            title: path.basename(absolute),
            relativePath,
            url: `/api/ai-agents/${params.agentId}/conversations/${params.conversationId}/artifacts/${relativePath}`,
        };
    }

    private async detectHtmlArtifact(params: {
        agentId: string;
        conversationId: string;
        artifactRoot: string;
        exclude?: Set<string>;
    }): Promise<HtmlArtifact | undefined> {
        const exclude = params.exclude ?? new Set<string>();
        const preferred = path.join(params.artifactRoot, preferredHtmlEntryRelativePath());
        try {
            await fs.access(preferred);
            const resolved = path.resolve(preferred);
            if (!exclude.has(resolved)) {
                return this.buildHtmlArtifact({
                    agentId: params.agentId,
                    conversationId: params.conversationId,
                    artifactRoot: params.artifactRoot,
                    absolutePath: preferred,
                });
            }
        } catch {
            // fall through to scan
        }

        try {
            const entries = await fs.readdir(params.artifactRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && /\.html?$/i.test(entry.name)) {
                    const absolute = path.resolve(params.artifactRoot, entry.name);
                    if (!exclude.has(absolute)) {
                        return this.buildHtmlArtifact({
                            agentId: params.agentId,
                            conversationId: params.conversationId,
                            artifactRoot: params.artifactRoot,
                            absolutePath: absolute,
                        });
                    }
                }
            }
        } catch {
            return undefined;
        }
        return undefined;
    }

    private async snapshotHtmlFiles(artifactRoot: string): Promise<Set<string>> {
        const files = new Set<string>();
        try {
            const entries = await fs.readdir(artifactRoot, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile() && /\.html?$/i.test(entry.name)) {
                    files.add(path.resolve(artifactRoot, entry.name));
                }
            }
        } catch {
            // directory may not exist yet — return empty set
        }
        return files;
    }

    private truncate(value: string): string {
        if (value.length <= MAX_TOOL_OUTPUT_CHARS) return value;
        return `${value.slice(0, MAX_TOOL_OUTPUT_CHARS)}\n...(truncated)`;
    }

    private formatSessionError(err: unknown): string {
        if (typeof err === "string") return err;
        if (!err || typeof err !== "object") return "OpenCode session error";
        const record = err as Record<string, any>;
        const nested = record.data?.message || record.message;
        if (typeof nested === "string" && nested.trim()) {
            // Prefer first line for stack-bearing ProviderModelNotFoundError
            return nested.split("\n")[0]!.trim();
        }
        if (typeof record.name === "string") return record.name;
        try {
            return JSON.stringify(err);
        } catch {
            return "OpenCode session error";
        }
    }

    private async getBillingRule(): Promise<{ power: number; tokens: number } | undefined> {
        const config = await this.agentConfigService.getConfig();
        const item = config.createTypes.find((current) => current.key === "opencode");
        if (!item?.enabled || item.billingMode !== "points") {
            return undefined;
        }

        const points = Math.max(0, Number(item.points ?? 0) || 0);
        if (points <= 0) {
            return undefined;
        }

        return {
            power: points,
            tokens: 1000,
        };
    }

    private async saveMessages(params: {
        conversationId: string;
        params: AgentChatCompletionParams;
        writer: ProviderWriter;
        lastUser?: UIMessage;
        responseMessage: UIMessage;
        usage?: ChatMessageUsage;
        userConsumedPower?: number;
        metadata?: Record<string, any>;
    }): Promise<void> {
        const {
            conversationId,
            params: chatParams,
            writer,
            lastUser,
            responseMessage,
            usage,
            userConsumedPower,
        } = params;

        let userMessageId: string | undefined;
        if (chatParams.isRegenerate) {
            userMessageId = chatParams.regenerateParentId;
        } else if (lastUser) {
            const savedUserMessage = await this.agentChatMessageService.createMessage({
                conversationId,
                agentId: chatParams.agentId,
                userId: chatParams.userId,
                message: lastUser,
                formVariables: chatParams.formVariables,
                formFieldsInputs: chatParams.formFieldsInputs,
                parentId: chatParams.parentId,
            });
            userMessageId = savedUserMessage.id;
            writer.write({ type: "data-user-message-id", data: savedUserMessage.id });
        }

        const savedAssistantMessage = await this.agentChatMessageService.createMessage({
            conversationId,
            agentId: chatParams.agentId,
            userId: chatParams.userId,
            message: {
                ...(responseMessage as ChatUIMessage),
                ...(usage ? { usage } : {}),
                ...(userConsumedPower != null ? { userConsumedPower } : {}),
            } as ChatUIMessage,
            parentId: userMessageId,
        });

        writer.write({
            type: "data-assistant-message-id",
            data: savedAssistantMessage.id,
        });
        await this.agentChatRecordService.updateStats(conversationId);
    }
}
