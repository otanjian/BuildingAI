import { provisionMfgVarAgent, updateSettings } from "../services/settings";

/**
 * Create or update MFGV agent via extension API (registers mfg-var-mcp + syncs profile).
 */
export async function provisionMfgVarAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionMfgVarAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
