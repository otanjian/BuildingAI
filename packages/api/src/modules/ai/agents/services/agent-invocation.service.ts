import type { Agent } from "@buildingai/db/entities";
import type { RequestAuthSource } from "@common/types/request-auth-context";
import { Injectable, Logger } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";

import { AgentBillingHandler } from "../handlers/agent-billing";
import { AgentsService } from "./agents.service";
import { AiModelService } from "../../model/services/ai-model.service";

const MAX_TASK_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 8_000;
const MAX_OUTPUT_CHARS = 8_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_CALLS = 3;

export type AgentInvocationRequest = {
    parentAgent: Agent;
    targetAgentId: string;
    task: string;
    context?: Record<string, unknown>;
    userId: string;
    tenantId?: string;
    projectId?: string;
    authSource?: RequestAuthSource;
    parentConversationId?: string;
    abortSignal?: AbortSignal;
    callId: string;
    timeoutMs?: number;
    callCount: number;
};

export type AgentInvocationResult = {
    status: "succeeded" | "failed";
    agentId: string;
    agentName?: string;
    answer?: string;
    errorCode?: string;
    message?: string;
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
};

type MockResponse = {
    writableEnded: boolean;
    headersSent: boolean;
    statusCode: number;
    setHeader(name: string, value: string): MockResponse;
    writeHead(status: number): MockResponse;
    write(chunk: Buffer | string): boolean;
    end(chunk?: Buffer | string): void;
    on(event: string, listener: (...args: unknown[]) => void): MockResponse;
    once(event: string, listener: (...args: unknown[]) => void): MockResponse;
    flushHeaders?(): void;
};

@Injectable()
export class AgentInvocationService {
    private readonly logger = new Logger(AgentInvocationService.name);

    constructor(
        private readonly agentsService: AgentsService,
        private readonly aiModelService: AiModelService,
        private readonly agentBillingHandler: AgentBillingHandler,
        private readonly moduleRef: ModuleRef,
    ) {}

    getPolicy(parent: Agent) {
        const config = parent.toolConfig?.agentDelegation;
        if (parent.createMode !== "direct" || config?.enabled !== true) return null;
        return {
            allowedAgentIds: new Set(config.allowedAgentIds ?? []),
            maxCallsPerTurn: Math.min(Math.max(Number(config.maxCallsPerTurn) || DEFAULT_MAX_CALLS, 1), DEFAULT_MAX_CALLS),
            timeoutMs: Math.min(Math.max(Number(config.timeoutMs) || DEFAULT_TIMEOUT_MS, 1_000), MAX_TIMEOUT_MS),
        };
    }

    async invoke(input: AgentInvocationRequest): Promise<AgentInvocationResult> {
        const policy = this.getPolicy(input.parentAgent);
        const fail = (errorCode: string, message: string): AgentInvocationResult => ({
            status: "failed",
            agentId: input.targetAgentId,
            errorCode,
            message,
        });

        if (!policy) return fail("DELEGATION_DISABLED", "Agent delegation is not enabled");
        if (input.callCount >= policy.maxCallsPerTurn) {
            return fail("CALL_LIMIT_REACHED", "The parent agent call limit has been reached");
        }
        if (!policy.allowedAgentIds.has(input.targetAgentId)) {
            return fail("AGENT_NOT_ALLOWED", "The target agent is not allowlisted");
        }

        const target = await this.agentsService.findOne({ where: { id: input.targetAgentId } });
        if (!target || target.createMode !== "direct") {
            return fail("AGENT_NOT_FOUND", "The target Direct agent was not found");
        }
        if (
            (input.tenantId && target.tenantId !== input.tenantId) ||
            (input.projectId && target.projectId && target.projectId !== input.projectId)
        ) {
            return fail("AGENT_SCOPE_DENIED", "The target agent is outside the current scope");
        }
        if (target.createBy !== input.userId && !input.parentAgent.publishedToSquare) {
            return fail("AGENT_ACCESS_DENIED", "The current user cannot access the target agent");
        }

        const task = input.task.trim();
        if (!task) return fail("INVALID_TASK", "The child task cannot be empty");
        if (task.length > MAX_TASK_CHARS) return fail("TASK_TOO_LARGE", "The child task is too large");
        let contextText = "";
        if (input.context !== undefined) {
            try {
                contextText = JSON.stringify(input.context);
            } catch {
                return fail("INVALID_CONTEXT", "The child context is not serializable");
            }
            if (contextText.length > MAX_CONTEXT_CHARS) {
                return fail("CONTEXT_TOO_LARGE", "The child context is too large");
            }
        }

        const model = target.modelConfig?.id
            ? await this.aiModelService.findOne({
                  where: { id: target.modelConfig.id, isActive: true },
              })
            : null;
        if (!model) return fail("MODEL_NOT_CONFIGURED", "The target Direct agent has no active model");

        try {
            await this.agentBillingHandler.validateUserPower(input.userId, model.billingRule);
            const startedAt = Date.now();
            const parsed = await this.runBlocking({
                target,
                task: contextText ? `${task}\n\nContext:\n${contextText}` : task,
                userId: input.userId,
                tenantId: input.tenantId,
                projectId: input.projectId,
                authSource: input.authSource,
                parentConversationId: input.parentConversationId,
                abortSignal: input.abortSignal,
                timeoutMs: input.timeoutMs ?? policy.timeoutMs,
            });
            if (!parsed.answer.trim()) return fail("EMPTY_RESULT", "The child agent returned an empty response");
            const answer = parsed.answer.slice(0, MAX_OUTPUT_CHARS);
            this.logger.log(JSON.stringify({
                event: "agent_delegation",
                callId: input.callId,
                parentAgentId: input.parentAgent.id,
                childAgentId: target.id,
                status: "succeeded",
                durationMs: Date.now() - startedAt,
                usage: parsed.usage,
            }));
            return {
                status: "succeeded",
                agentId: target.id,
                agentName: target.name,
                answer,
                usage: parsed.usage,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const errorCode = message.includes("timed out")
                ? "AGENT_TIMEOUT"
                : message.includes("cancelled")
                  ? "AGENT_CANCELLED"
                  : "AGENT_EXECUTION_FAILED";
            this.logger.warn(JSON.stringify({
                event: "agent_delegation",
                callId: input.callId,
                parentAgentId: input.parentAgent.id,
                childAgentId: target.id,
                status: "failed",
                errorCode,
            }));
            return fail(
                errorCode,
                errorCode === "AGENT_TIMEOUT"
                    ? "The child agent timed out"
                    : errorCode === "AGENT_CANCELLED"
                      ? "The child agent was cancelled"
                      : "The child agent failed",
            );
        }
    }

    private async runBlocking(input: {
        target: Agent;
        task: string;
        userId: string;
        tenantId?: string;
        projectId?: string;
        authSource?: RequestAuthSource;
        parentConversationId?: string;
        abortSignal?: AbortSignal;
        timeoutMs: number;
    }): Promise<{ answer: string; usage?: AgentInvocationResult["usage"] }> {
        let answer = "";
        let usage: AgentInvocationResult["usage"];
        let buffer = "";
        let doneResolve!: () => void;
        const done = new Promise<void>((resolve) => (doneResolve = resolve));
        const consume = (line: string) => {
            if (!line.startsWith("data: ")) return;
            try {
                const event = JSON.parse(line.slice(6));
                if (event.type === "text-delta") {
                    answer = `${answer}${String(event.delta ?? "")}`.slice(0, MAX_OUTPUT_CHARS);
                }
                if (event.type === "data-usage") usage = event.data;
                if (event.type === "error") throw new Error(String(event.errorText || event.message || "Child agent failed"));
            } catch (error) {
                if (error instanceof Error && (error.message === "Child agent failed" || error.message.startsWith("Child agent"))) throw error;
            }
        };
        let ended = false;
        let streamError: Error | undefined;
        const response: MockResponse = {
            writableEnded: false,
            headersSent: false,
            statusCode: 200,
            setHeader: () => response,
            writeHead: (status) => { response.statusCode = status; response.headersSent = true; return response; },
            write: (chunk) => {
                buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    try {
                        consume(line.replace(/\r$/, ""));
                    } catch (error) {
                        streamError = error instanceof Error ? error : new Error(String(error));
                    }
                }
                return true;
            },
            end: (chunk) => {
                if (chunk) response.write(chunk);
                if (buffer) {
                    try {
                        consume(buffer);
                    } catch (error) {
                        streamError = error instanceof Error ? error : new Error(String(error));
                    }
                }
                ended = true;
                response.writableEnded = true;
                doneResolve();
            },
            on: () => response,
            once: () => response,
            flushHeaders: () => { response.headersSent = true; },
        };
        const controller = new AbortController();
        const boundedTimeout = Math.max(1_000, input.timeoutMs);
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        let cancelListener: (() => void) | undefined;
        const deadline = new Promise<never>((_, reject) => {
            timeoutHandle = setTimeout(() => {
                controller.abort();
                reject(new Error("Child agent timed out"));
            }, boundedTimeout);
        });
        const cancellation = new Promise<never>((_, reject) => {
            if (!input.abortSignal) return;
            cancelListener = () => {
                controller.abort();
                reject(new Error("Child agent cancelled"));
            };
            if (input.abortSignal.aborted) cancelListener();
            else input.abortSignal.addEventListener("abort", cancelListener, { once: true });
        });
        try {
            const completionService = this.moduleRef.get("AGENT_CHAT_COMPLETION_SERVICE", { strict: false }) as {
                streamChat: (params: any, response: any) => Promise<void>;
            };
            const streamPromise = completionService.streamChat({
                agentId: input.target.id,
                userId: input.userId,
                tenantId: input.tenantId,
                projectId: input.projectId,
                authSource: input.authSource ?? "login",
                saveConversation: false,
                messages: [{ role: "user", parts: [{ type: "text", text: input.task }] } as any],
                abortSignal: controller.signal,
                internalInvocation: {
                    disableDelegation: true,
                    billingConversationId: input.parentConversationId || undefined,
                },
            }, response as any);
            // Do not wait indefinitely for a provider that ignores AbortSignal.
            void streamPromise.catch(() => undefined);
            await Promise.race([streamPromise, deadline, cancellation]);
            await Promise.race([
                done,
                deadline,
                cancellation,
            ]);
            if (streamError) throw streamError;
            if (!ended) throw new Error("Child agent did not finish");
            if (response.statusCode >= 400) throw new Error("Child agent failed");
            return { answer, usage };
        } finally {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            if (cancelListener && input.abortSignal) {
                input.abortSignal.removeEventListener("abort", cancelListener);
            }
            if (!response.writableEnded) controller.abort();
        }
    }
}
