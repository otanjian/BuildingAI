import { provisionOtifAgent, updateSettings } from "../services/settings";

/**
 * Create or update OTIF agent via extension API (registers otif-mcp + syncs profile).
 */
export async function provisionOtifAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionOtifAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
