import { provisionChannelInvAgent, updateSettings } from "../services/settings";

/**
 * Create or update CHI agent via extension API (registers channel-inv-mcp + syncs profile).
 */
export async function provisionChannelInvAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionChannelInvAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
