import { EHCS_PLATFORM_AGENT_NAME } from "@buildingai/constants/shared/ehcs-agent.constant";
import type { RequestAuthSource } from "@common/types/request-auth-context";

import { createBowiInvocationAssertion } from "./bowi-invocation-assertion";
import type { BowiAutomationScope, BowiCapability } from "../types/bowi-mcp.types";
import { configuredSapCapabilities } from "../sap/sap-capabilities";

export function getAgentBowiCapabilities(agentName: string): BowiCapability[] {
    return agentName === EHCS_PLATFORM_AGENT_NAME ? ["ehcs.operator"] : [];
}

export function buildBowiMcpHeaders(input: {
    serverName: string;
    existing?: Record<string, string>;
    invocation?: {
        userId: string;
        agentId: string;
        tenantId?: string;
        agentName: string;
        conversationId?: string;
        authSource: RequestAuthSource;
        automationScope?: BowiAutomationScope;
    };
}): Record<string, string> | undefined {
    if (input.serverName !== "bowi-mcp" || !input.invocation) return input.existing;
    return {
        ...(input.existing ?? {}),
        "x-buildingai-bowi-invocation": createBowiInvocationAssertion({
            userId: input.invocation.userId,
            agentId: input.invocation.agentId,
            tenantId: input.invocation.tenantId,
            conversationId: input.invocation.conversationId,
            authSource: input.invocation.authSource,
            capabilities: [
                ...getAgentBowiCapabilities(input.invocation.agentName),
                ...(input.invocation.authSource === "login" ? configuredSapCapabilities() : []),
            ],
            automationScope: input.invocation.automationScope,
        }),
    };
}
