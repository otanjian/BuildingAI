import { RedisService } from "@buildingai/cache";
import { DictService } from "@buildingai/dict";
import { Injectable } from "@nestjs/common";
import { FeishuChannelService } from "../../channel/feishu/feishu-channel.service";
import type { UnattendedToolPolicy } from "../domain/automation.types";
import { signAutomationPolicy } from "./automation-policy-assertion";
import { parseAutomationAgentResponse } from "./automation-response";

export interface AutomationExecutionInput {
    agentId: string;
    jobId: string;
    runId: string;
    prompt: string;
    conversationId?: string | null;
    timeoutSeconds: number;
    accountId?: string;
    toolPolicy?: UnattendedToolPolicy;
}

export interface AutomationExecutionResult {
    answer: string;
    conversationId?: string;
}

export interface AutomationExecutor {
    execute(input: AutomationExecutionInput): Promise<AutomationExecutionResult>;
}

/**
 * Uses the same published-agent contract as the Feishu channel. Credentials are resolved from
 * the existing server-side channel config and never copied into an automation row or result.
 */
@Injectable()
export class PublishedAgentAutomationExecutor implements AutomationExecutor {
    constructor(
        private readonly dictService: DictService,
        private readonly redisService: RedisService,
        private readonly feishuChannelService: FeishuChannelService,
    ) {}

    async execute(input: AutomationExecutionInput): Promise<AutomationExecutionResult> {
        const token = await this.feishuChannelService.getAutomationAccessToken(
            input.accountId,
            input.agentId,
        );
        if (!token)
            throw new Error("Agent is not configured with a server-side channel access token");
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), input.timeoutSeconds * 1000);
        try {
            const base = resolveAgentApiDomain();
            const response = await fetch(`${base}/v1/chat-messages`, {
                method: "POST",
                signal: controller.signal,
                headers: {
                    authorization: `Bearer ${token}`,
                    "content-type": "application/json",
                    accept: "application/json, text/event-stream",
                    "x-anonymous-identifier": `automation:${input.agentId}:${input.jobId}`,
                    "x-automation-run": input.runId,
                    "x-automation-context": "server",
                    "x-automation-policy-signature": input.toolPolicy
                        ? signAutomationPolicy(input.runId, input.toolPolicy)
                        : "",
                },
                body: JSON.stringify({
                    message: { role: "user", parts: [{ type: "text", text: input.prompt }] },
                    responseMode: "blocking",
                    saveConversation: false,
                    ...(input.conversationId ? { conversationId: input.conversationId } : {}),
                    ...(input.toolPolicy ? { automationToolPolicy: input.toolPolicy } : {}),
                }),
            });
            const raw = await response.text();
            let parsed: ReturnType<typeof parseAutomationAgentResponse>;
            try {
                parsed = parseAutomationAgentResponse(raw, response.headers.get("content-type") || "");
            } catch {
                throw new Error("Agent returned malformed JSON");
            }
            if (!response.ok)
                throw new Error(
                    parsed.error || `Agent request failed (${response.status})`,
                );
            if (parsed.error) throw new Error(parsed.error);
            if (!parsed.answer.trim()) throw new Error("Agent returned an empty response");
            return {
                answer: parsed.answer,
                conversationId: parsed.conversationId,
            };
        } catch (error) {
            if ((error as Error).name === "AbortError") {
                const timeoutError = new Error("Agent execution timed out");
                (timeoutError as Error & { unknownOutcome?: boolean }).unknownOutcome = true;
                throw timeoutError;
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }
}

function resolveAgentApiDomain(): string {
    const explicit = process.env.BUILDINGAI_API_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");
    const configured =
        process.env.VITE_PRODUCTION_APP_BASE_URL?.trim() || process.env.APP_DOMAIN?.trim();
    if (!configured) throw new Error("APP_DOMAIN is not configured");
    const url = new URL(configured);
    if (url.hostname === "mac.bosofts.com") url.hostname = "api.mac.bosofts.com";
    return url.toString().replace(/\/$/, "");
}
