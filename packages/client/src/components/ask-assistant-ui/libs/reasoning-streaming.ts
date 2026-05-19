import type { UIMessage } from "ai";

type MessagePart = NonNullable<UIMessage["parts"]>[number];

/**
 * Reasoning UI should stop showing "Thinking..." once the model has moved on to
 * tools or answer text, even if the overall assistant turn is still streaming.
 */
export function isReasoningPartStreaming(
  parts: UIMessage["parts"] | undefined,
  reasoningIndexAmongReasoningParts: number,
  messageIsStreaming: boolean,
): boolean {
  if (!messageIsStreaming || !parts?.length) {
    return false;
  }

  const reasoningEntries = parts
    .map((part, index) => ({ part, index }))
    .filter((entry): entry is { part: MessagePart; index: number } => entry.part.type === "reasoning");

  const target = reasoningEntries[reasoningIndexAmongReasoningParts];
  if (!target) {
    return false;
  }

  const reasoningState = (target.part as { state?: string }).state;
  if (reasoningState === "done") {
    return false;
  }

  const hasActivityAfterReasoning = parts.slice(target.index + 1).some((part) => {
    if (part.type === "reasoning") {
      return false;
    }
    if (part.type === "text") {
      return Boolean((part as { text?: string }).text?.trim());
    }
    if (part.type === "dynamic-tool") {
      return true;
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      return true;
    }
    return false;
  });

  return !hasActivityAfterReasoning;
}
