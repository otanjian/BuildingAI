import { provisionInvOptAgent, updateSettings } from "../services/settings";

/**
 * Create or update INVO agent via extension API (registers inv-opt-mcp + syncs profile).
 */
export async function provisionInvOptAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionInvOptAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
