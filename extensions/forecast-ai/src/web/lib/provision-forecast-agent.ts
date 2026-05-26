import { provisionForecastAgent, updateSettings } from "../services/settings";

/**
 * Create or update FCST agent via extension API (registers forecast-mcp + syncs profile).
 */
export async function provisionForecastAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionForecastAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
