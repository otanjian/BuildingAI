import { provisionHrComplianceAgent, updateSettings } from "../services/settings";

/**
 * Create or update HRC agent via extension API (registers hr-compliance-mcp + syncs profile).
 */
export async function provisionHrComplianceAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionHrComplianceAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
