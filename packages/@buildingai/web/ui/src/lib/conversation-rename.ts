/** Query key prefix for agent conversation list queries. */
export const AGENT_CHAT_CONVERSATIONS_QUERY_KEY = ["agents", "chat", "conversations"] as const;

/**
 * Whether a rename dialog submission should call the update API.
 */
export function shouldCommitConversationRename(currentTitle: string, nextTitle: string): boolean {
  const trimmed = nextTitle.trim();
  return trimmed.length > 0 && trimmed !== currentTitle;
}
