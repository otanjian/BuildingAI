import { provisionEnergyCarbonAgent, updateSettings } from "../services/settings";

/**
 * Create or update ECO agent via extension API (registers energy-carbon-mcp + syncs profile).
 */
export async function provisionEnergyCarbonAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionEnergyCarbonAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
