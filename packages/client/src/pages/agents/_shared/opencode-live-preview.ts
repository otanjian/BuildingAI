import type { UIMessage } from "ai";

export type OpencodeSessionMessage = {
  info?: { id?: string; role?: string; finish?: string | null; error?: unknown };
  parts?: Array<Record<string, unknown>>;
};

/**
 * Build a temporary assistant preview from the latest unfinished OpenCode
 * session message. Replaced by the persisted BuildingAI message once the
 * detached turn finishes.
 */
export function buildOpencodeLivePreview(
  userMessageId: string,
  ocMessages: OpencodeSessionMessage[],
): UIMessage | undefined {
  const lastAssistant = [...ocMessages].reverse().find((m) => m.info?.role === "assistant");
  if (!lastAssistant) return undefined;

  const finish = lastAssistant.info?.finish;
  if (finish != null && finish !== "") return undefined;

  const textParts: string[] = [];
  const toolParts: string[] = [];

  for (const part of lastAssistant.parts ?? []) {
    if (part.type === "text" && typeof part.text === "string") {
      textParts.push(part.text);
      continue;
    }
    if (part.type === "tool") {
      const toolName = String(part.tool ?? "tool");
      if (toolName === "question") continue;
      const state = (part.state as Record<string, unknown>) ?? {};
      const status = String(state.status ?? "pending");
      const input = (state.input as Record<string, unknown>) ?? {};
      const path = String(input.filePath ?? input.path ?? input.file ?? "");
      const summary = path ? `${toolName} (${status}) — ${path}` : `${toolName} (${status})`;
      toolParts.push(summary);
    }
  }

  const fullText = [...toolParts, ...textParts].join("\n\n").trim();
  if (!fullText) return undefined;

  return {
    id: `oc-live-${userMessageId}`,
    role: "assistant",
    parts: [{ type: "text" as const, text: fullText }],
    metadata: {
      isOpencodeLivePreview: true,
      sourceOpencodeMessageId: lastAssistant.info?.id,
      parentId: userMessageId,
    },
  };
}
