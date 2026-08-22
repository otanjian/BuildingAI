import type { UIMessage } from "ai";

import type { OpencodeSessionMessage } from "./opencode-live-preview";

type OpenCodePart = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toolState(state: Record<string, unknown>): {
  state: "input-available" | "output-available" | "output-error";
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
} {
  const status = String(state.status ?? state.state ?? "running").toLowerCase();
  const input = asRecord(state.input ?? state.args ?? state.arguments);
  if (["error", "failed", "failure"].includes(status)) {
    return {
      state: "output-error",
      input,
      errorText: String(state.error ?? state.message ?? "OpenCode tool failed"),
    };
  }
  if (["completed", "complete", "success", "done"].includes(status)) {
    return { state: "output-available", input, output: state.output ?? state.result };
  }
  return { state: "input-available", input };
}

function mapPart(part: OpenCodePart): UIMessage["parts"][number] | null {
  if (part.type === "text" && typeof part.text === "string") {
    return { type: "text", text: part.text };
  }
  if (part.type === "reasoning" && typeof part.text === "string") {
    return { type: "reasoning", text: part.text };
  }
  if (part.type !== "tool") return null;

  const toolName = String(part.tool ?? "tool");
  if (toolName === "question") return null;
  const callId = String(part.callID ?? part.toolCallId ?? part.id ?? "");
  if (!callId) return null;
  const mapped = toolState(asRecord(part.state));
  return {
    type: "dynamic-tool",
    toolCallId: callId,
    toolName,
    state: mapped.state,
    ...(mapped.input ? { input: mapped.input } : {}),
    ...(mapped.output !== undefined ? { output: mapped.output } : {}),
    ...(mapped.errorText ? { errorText: mapped.errorText } : {}),
  } as UIMessage["parts"][number];
}

function mapMessage(message: OpencodeSessionMessage, index: number): UIMessage | null {
  const info = asRecord(message.info);
  const role = info.role === "user" || info.role === "assistant" ? info.role : null;
  if (!role) return null;
  const id = typeof info.id === "string" && info.id ? info.id : `opencode-message-${index}`;
  const parts = (message.parts ?? [])
    .map(asRecord)
    .map(mapPart)
    .filter(Boolean) as UIMessage["parts"];
  return {
    id,
    role,
    parts,
    metadata: { opencodeSessionMessage: true, opencodeFinish: info.finish ?? null },
  } as UIMessage;
}

export function mapOpencodeSessionMessages(messages: OpencodeSessionMessage[]): UIMessage[] {
  return messages.map(mapMessage).filter(Boolean) as UIMessage[];
}

export function mergeOpencodeSessionMessages(
  base: OpencodeSessionMessage[],
  updates: OpencodeSessionMessage[],
): OpencodeSessionMessage[] {
  const merged = new Map<string, OpencodeSessionMessage>();
  for (const [index, item] of base.entries()) {
    const id = item.info?.id ?? `opencode-message-${index}`;
    merged.set(id, item);
  }
  for (const [index, item] of updates.entries()) {
    const id = item.info?.id ?? `opencode-live-${index}`;
    const previous = merged.get(id);
    merged.set(
      id,
      previous
        ? {
            ...previous,
            ...item,
            parts: item.parts && item.parts.length > 0 ? item.parts : previous.parts,
          }
        : item,
    );
  }
  return [...merged.values()];
}
