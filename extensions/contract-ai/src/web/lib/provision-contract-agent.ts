import { provisionContractAgent, updateSettings } from "../services/settings";

/**
 * Create or update CTR agent via extension API (registers contract-mcp + syncs profile).
 */
export async function provisionContractAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionContractAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
