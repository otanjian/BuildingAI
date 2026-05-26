import { provisionProcAuditAgent, updateSettings } from "../services/settings";

/**
 * Create or update PROC agent via extension API (registers proc-audit-mcp + syncs profile).
 */
export async function provisionProcAuditAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionProcAuditAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
