import { provisionApOptAgent, updateSettings } from "../services/settings";

/**
 * Create or update APO agent via extension API (registers ap-opt-mcp + syncs profile).
 */
export async function provisionApOptAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionApOptAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
