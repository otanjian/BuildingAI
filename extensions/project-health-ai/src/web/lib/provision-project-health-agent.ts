import { provisionProjectHealthAgent, updateSettings } from "../services/settings";

/**
 * Create or update PRJ agent via extension API (registers project-health-mcp + syncs profile).
 */
export async function provisionProjectHealthAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionProjectHealthAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
