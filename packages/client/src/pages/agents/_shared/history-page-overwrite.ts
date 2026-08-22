import type { UIMessage } from "ai";

/** Determines whether the active conversation needs its first persisted page. */
export function shouldApplyHistoryPageToChat(params: {
  shouldLoadInitial: boolean;
  switched: boolean;
  liveMessageCount: number;
}): boolean {
  return params.shouldLoadInitial || params.switched;
}

/**
 * Reconciles a persisted page with messages that entered the active Chat while
 * the request was in flight. Local message ids stay authoritative for live
 * callbacks, while persisted ordering and metadata are retained.
 */
export function mergeHistoryPageWithLiveMessages(
  history: UIMessage[],
  live: UIMessage[],
  getDbMessageId: (clientMessageId: string) => string | undefined,
): UIMessage[] {
  const merged = [...history];
  const historyIndexById = new Map(history.map((message, index) => [message.id, index]));
  const appendedLiveIds = new Set<string>();

  for (const liveMessage of live) {
    const persistedId = getDbMessageId(liveMessage.id) ?? liveMessage.id;
    const historyIndex = historyIndexById.get(persistedId);

    if (historyIndex !== undefined) {
      const persistedMessage = merged[historyIndex];
      merged[historyIndex] = {
        ...persistedMessage,
        ...liveMessage,
        id: liveMessage.id,
        metadata: {
          ...((persistedMessage.metadata as Record<string, unknown> | undefined) ?? {}),
          ...((liveMessage.metadata as Record<string, unknown> | undefined) ?? {}),
        },
      } as UIMessage;
      continue;
    }

    if (!appendedLiveIds.has(liveMessage.id)) {
      merged.push(liveMessage);
      appendedLiveIds.add(liveMessage.id);
    }
  }

  return merged;
}
