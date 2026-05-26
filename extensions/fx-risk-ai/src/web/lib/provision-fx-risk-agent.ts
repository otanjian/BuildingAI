import { provisionFxRiskAgent, updateSettings } from "../services/settings";

/**
 * Create or update FXR agent via extension API (registers fx-risk-mcp + syncs profile).
 */
export async function provisionFxRiskAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionFxRiskAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
