import { provisionBudgetControlAgent, updateSettings } from "../services/settings";

/**
 * Create or update BDG agent via extension API (registers budget-control-mcp + syncs profile).
 */
export async function provisionBudgetControlAgentViaPlatform(): Promise<{
    agentId: string;
    created: boolean;
}> {
    const result = await provisionBudgetControlAgent();
    await updateSettings({ agentId: result.agentId });
    return result;
}
