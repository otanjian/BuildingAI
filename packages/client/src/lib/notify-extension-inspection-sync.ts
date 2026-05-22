/** Must match extensions/erp-healthy inspection-parent-sync message type */
export const INSPECTION_PARENT_SYNC_MESSAGE_TYPE = "erp-healthy-inspection-sync" as const;

export type ParentAssistantReplyPayload = {
  runId: string;
  ruleCode: string;
  text: string;
  platformMessageId?: string;
  failed?: boolean;
};

export type InspectionParentSyncPayload = {
  type: typeof INSPECTION_PARENT_SYNC_MESSAGE_TYPE;
  conversationId?: string;
  trigger?: boolean;
  assistantReply?: ParentAssistantReplyPayload;
};

function extractUiMessageText(message: {
  role: string;
  parts?: Array<{ type: string; text?: string }>;
}): string {
  if (message.role !== "assistant" && message.role !== "user") {
    return "";
  }
  return (message.parts ?? [])
    .filter((p) => (p.type === "text" || p.type === "reasoning") && typeof p.text === "string")
    .map((p) => p.text!)
    .join("\n");
}

/** Parse inspection metadata from the latest user prompt in the embedded chat. */
export function parseInspectionMetaFromChatMessages(
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
): { runId: string; ruleCode: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role !== "user") {
      continue;
    }
    const text = extractUiMessageText(message);
    const runMatch = text.match(/runId=([0-9a-f-]{36})/i);
    const ruleMatch = text.match(/ruleCode=([A-Z0-9_]+)/i);
    if (runMatch?.[1] && ruleMatch?.[1]) {
      return { runId: runMatch[1], ruleCode: ruleMatch[1] };
    }
  }
  return null;
}

export function buildAssistantReplyFromChatMessages(
  messages: Array<{ role: string; parts?: Array<{ type: string; text?: string }> }>,
): ParentAssistantReplyPayload | null {
  const meta = parseInspectionMetaFromChatMessages(messages);
  if (!meta) {
    return null;
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role !== "assistant") {
      continue;
    }
    const text = extractUiMessageText(message);
    if (text.trim().length < 40) {
      continue;
    }
    return { ...meta, text };
  }
  return null;
}

export function notifyExtensionInspectionSync(
  appsIdentifier: string | undefined,
  payload: Omit<InspectionParentSyncPayload, "type">,
): void {
  if (!appsIdentifier || typeof document === "undefined") {
    return;
  }

  const message: InspectionParentSyncPayload = {
    type: INSPECTION_PARENT_SYNC_MESSAGE_TYPE,
    ...payload,
  };

  const iframe = document.querySelector<HTMLIFrameElement>(`iframe[title="${appsIdentifier}"]`);
  iframe?.contentWindow?.postMessage(message, "*");
}

export function resolveAppsExtensionIdentifier(pathname: string): string | undefined {
  const match = pathname.match(/^\/apps\/([^/]+)/);
  return match?.[1];
}
