type ConversationSummary = { id: string };

type OpencodeEntryRouteInput = {
  agentId: string;
  isOpencodeAgent: boolean;
  conversationId?: string;
  historyStatus: "loading" | "success" | "error";
  conversations?: ConversationSummary[];
};

export type OpencodeEntryRouteDecision =
  | { kind: "stay" | "wait" | "error" | "create-draft" }
  | { kind: "open"; conversationId: string };

/** Resolve the initial OpenCode route only after authoritative history has loaded. */
export function resolveOpencodeEntryRoute(
  input: OpencodeEntryRouteInput,
): OpencodeEntryRouteDecision {
  if (!input.agentId || !input.isOpencodeAgent || input.conversationId) {
    return { kind: "stay" };
  }
  if (input.historyStatus === "loading") return { kind: "wait" };
  if (input.historyStatus === "error") return { kind: "error" };

  const latestConversation = input.conversations?.[0];
  if (latestConversation) {
    return { kind: "open", conversationId: latestConversation.id };
  }
  return { kind: "create-draft" };
}
