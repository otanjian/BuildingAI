/** Build the creator/workspace-owner predicates shared by web task reads and mutations. */
export function automationCreatorFilters(
    creatorId: string,
    ownedAgentIds: string[],
): Array<{ creatorId: string } | { agentId: string }> {
    return [{ creatorId }, ...ownedAgentIds.map((agentId) => ({ agentId }))];
}
