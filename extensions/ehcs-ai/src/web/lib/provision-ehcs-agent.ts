import { provisionEhcsAgent, updateSettings } from "../services/settings";

/**
 * Create or update EHCS agent via extension API (registers ehcs-mcp + syncs profile).
 */
export async function provisionEhcsAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionEhcsAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
