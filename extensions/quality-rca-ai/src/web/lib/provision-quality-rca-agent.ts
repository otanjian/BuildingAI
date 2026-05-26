import { provisionQualityRcaAgent, updateSettings } from "../services/settings";

/**
 * Create or update QRCA agent via extension API (registers quality-rca-mcp + syncs profile).
 */
export async function provisionQualityRcaAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionQualityRcaAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
