export type LastConversationEntry = {
  conversationId: string;
  updatedAt: string;
};

export function lastConversationStorageKey(agentId: string): string {
  return `buildingai_last_conv_${agentId}`;
}

export function readLastConversation(agentId: string): LastConversationEntry | null {
  if (typeof window === "undefined" || !agentId) return null;
  try {
    const raw = window.localStorage.getItem(lastConversationStorageKey(agentId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastConversationEntry;
    if (!parsed?.conversationId?.trim()) return null;
    return {
      conversationId: parsed.conversationId.trim(),
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function writeLastConversation(agentId: string, conversationId: string): void {
  if (typeof window === "undefined" || !agentId || !conversationId) return;
  const entry: LastConversationEntry = {
    conversationId,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(lastConversationStorageKey(agentId), JSON.stringify(entry));
}

export function clearLastConversation(agentId: string): void {
  if (typeof window === "undefined" || !agentId) return;
  window.localStorage.removeItem(lastConversationStorageKey(agentId));
}

export function isEmbeddedHost(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

export function isOperatorMessage(message: UIMessageLike | undefined): boolean {
  if (!message || message.role !== "assistant") return false;
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { source?: string }).source === "operator";
}

type UIMessageLike = {
  role?: string;
  metadata?: unknown;
};
