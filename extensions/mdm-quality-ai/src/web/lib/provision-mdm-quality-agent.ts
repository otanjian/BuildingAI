import { provisionMdmQualityAgent, updateSettings } from "../services/settings";

/**
 * Create or update MDM agent via extension API (registers mdm-quality-mcp + syncs profile).
 */
export async function provisionMdmQualityAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionMdmQualityAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
