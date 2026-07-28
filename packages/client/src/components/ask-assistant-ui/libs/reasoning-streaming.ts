import type { ReasoningUIPart, UIMessage } from "ai";

type MessagePart = NonNullable<UIMessage["parts"]>[number];

export type PartitionedReasoningPart = {
  part: ReasoningUIPart;
  /** Index among all reasoning parts in the message (including empty). */
  reasoningIndex: number;
};

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

/**
 * Split reasoning parts so finished thoughts can be collapsed behind a single toggle.
 */
export function partitionReasoningPartsForDisplay(
  parts: UIMessage["parts"] | undefined,
  messageIsStreaming: boolean,
): {
  completed: PartitionedReasoningPart[];
  active: PartitionedReasoningPart[];
  shouldCollapseCompleted: boolean;
} {
  const reasoningEntries = (parts ?? [])
    .map((part, index) => ({ part, index }))
    .filter(
      (entry): entry is { part: ReasoningUIPart; index: number } => entry.part.type === "reasoning",
    );

  const completed: PartitionedReasoningPart[] = [];
  const active: PartitionedReasoningPart[] = [];

  reasoningEntries.forEach((entry, reasoningIndex) => {
    if (!entry.part.text?.trim()) {
      return;
    }

    const item: PartitionedReasoningPart = {
      part: entry.part,
      reasoningIndex,
    };

    if (isReasoningPartStreaming(parts, reasoningIndex, messageIsStreaming)) {
      active.push(item);
    } else {
      completed.push(item);
    }
  });

  return {
    completed,
    active,
    shouldCollapseCompleted: completed.length > 0,
  };
}
