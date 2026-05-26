import { provisionEsgReportAgent, updateSettings } from "../services/settings";

/**
 * Create or update ESG agent via extension API (registers esg-report-mcp + syncs profile).
 */
export async function provisionEsgReportAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionEsgReportAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
