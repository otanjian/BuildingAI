import { verifyBowiInvocationAssertion } from "../../bowi-mcp/utils/bowi-invocation-assertion";
import type { BowiAutomationScope } from "../../bowi-mcp/types/bowi-mcp.types";

export interface TrustedFeishuIdentity {
    userId: string;
    authSource: "login";
    conversationId?: string;
    automationScope?: BowiAutomationScope;
}

/**
 * Validates the server-signed identity header emitted by the Feishu channel adapter.
 * Unsigned or cross-agent values are ignored so the public chat endpoint keeps its
 * normal authentication behavior.
 */
export function resolveFeishuIdentityAssertion(
    assertion: unknown,
    agentId: string,
): TrustedFeishuIdentity | undefined {
    if (typeof assertion !== "string" || !assertion.trim()) return undefined;
    try {
        const claims = verifyBowiInvocationAssertion(assertion.trim());
        if (
            claims.agentId !== agentId ||
            claims.authSource !== "login" ||
            !claims.capabilities.includes("automation.personal")
        ) {
            return undefined;
        }
        return {
            userId: claims.userId,
            authSource: "login",
            conversationId: claims.conversationId,
            automationScope: claims.automationScope,
        };
    } catch {
        return undefined;
    }
}
