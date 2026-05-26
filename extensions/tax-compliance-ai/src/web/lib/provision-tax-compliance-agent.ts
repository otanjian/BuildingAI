import { provisionTaxComplianceAgent, updateSettings } from "../services/settings";

/**
 * Create or update TAX agent via extension API (registers tax-compliance-mcp + syncs profile).
 */
export async function provisionTaxComplianceAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionTaxComplianceAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
