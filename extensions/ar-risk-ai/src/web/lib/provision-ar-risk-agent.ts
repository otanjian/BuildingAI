import { provisionArRiskAgent, updateSettings } from "../services/settings";

/**
 * Create or update ARR agent via extension API (registers ar-risk-mcp + syncs profile).
 */
export async function provisionArRiskAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionArRiskAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
