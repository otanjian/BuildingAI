export type AgentHistoryHoverGroup = "menu-sub-item" | "command-item";

export function resolveAgentHistoryTitleDisplay(params: {
  title: string;
  agentName?: string | null;
}): {
  title: string;
  agentName: string | undefined;
  accessibleLabel: string;
  hasAgentName: boolean;
} {
  const title = params.title;
  const agentName = params.agentName?.trim() || undefined;
  return {
    title,
    agentName,
    hasAgentName: Boolean(agentName),
    accessibleLabel: agentName ? `${agentName} ${title}` : title,
  };
}

export function agentHistoryAgentNameClassName(hoverGroup: AgentHistoryHoverGroup): string {
  const hoverReveal =
    hoverGroup === "menu-sub-item"
      ? "group-hover/menu-sub-item:inline"
      : "group-hover/command-item:inline";
  return `text-muted-foreground mr-1 text-xs font-normal hidden ${hoverReveal}`;
}
