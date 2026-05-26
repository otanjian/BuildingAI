import { provisionServiceSlaAgent, updateSettings } from "../services/settings";

/**
 * Create or update SLA agent via extension API (registers service-sla-mcp + syncs profile).
 */
export async function provisionServiceSlaAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionServiceSlaAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
