import { provisionAssetLifeAgent, updateSettings } from "../services/settings";

/**
 * Create or update AST agent via extension API (registers asset-life-mcp + syncs profile).
 */
export async function provisionAssetLifeAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionAssetLifeAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
