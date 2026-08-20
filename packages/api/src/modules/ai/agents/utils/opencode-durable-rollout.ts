import type { Agent } from "@buildingai/db/entities";

export function isOpencodeDurableTurnsEnabled(
    agent: Pick<Agent, "createMode" | "thirdPartyIntegration"> | null | undefined,
): boolean {
    return (
        agent?.createMode === "opencode" &&
        agent.thirdPartyIntegration?.extendedConfig?.durableTurnsEnabled === true
    );
}
