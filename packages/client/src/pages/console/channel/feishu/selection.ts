export interface FeishuAgentSelectionOption {
  id: string;
  createMode?: string;
}

export interface FeishuChannelSelectionOption {
  agentId: string;
}

interface ResolveFeishuAgentIdOptions {
  currentAgentId: string;
  agents: FeishuAgentSelectionOption[];
  channels: FeishuChannelSelectionOption[];
  hasManualSelection: boolean;
}

export function filterFeishuAgents<T extends FeishuAgentSelectionOption>(agents: T[]): T[] {
  return agents.filter((agent) => agent.createMode === "direct");
}

/**
 * Resolve the agent shown by the Feishu channel form while async data loads.
 * A manually selected valid agent always wins; otherwise a saved channel wins
 * over the first agent returned by the list endpoint.
 */
export function resolveFeishuAgentId({
  currentAgentId,
  agents,
  channels,
  hasManualSelection,
}: ResolveFeishuAgentIdOptions): string {
  const isKnownAgent = (agentId: string) => agents.some((agent) => agent.id === agentId);

  if (hasManualSelection && isKnownAgent(currentAgentId)) return currentAgentId;

  const savedAgentId = channels.find((channel) => isKnownAgent(channel.agentId))?.agentId;
  if (savedAgentId) return savedAgentId;

  if (isKnownAgent(currentAgentId)) return currentAgentId;
  return agents[0]?.id ?? "";
}
