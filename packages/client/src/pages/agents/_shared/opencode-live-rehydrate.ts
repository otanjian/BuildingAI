/**
 * Decide whether to subscribe to OpenCode session events/poll for live UI
 * when the focused Chat is not actively receiving an HTTP stream (refresh,
 * orphaned Chat, or registry/status desync) while the server turn is still
 * running.
 */
export function shouldRehydrateOpencodeLive(params: {
  isOpencodeTurnRunning: boolean;
  hasStreamingRegistryChat: boolean;
  /** Focused useChat status — source of truth for "is UI receiving HTTP stream". */
  chatStatus?: string;
}): boolean {
  if (!params.isOpencodeTurnRunning) return false;

  const chatIsLive =
    params.chatStatus === "streaming" || params.chatStatus === "submitted";
  if (chatIsLive) return false;

  // Server turn is running but this Chat is idle/ready. Rehydrate even if the
  // registry still flags "streaming" (desync after orphaned/aborted fetch).
  if (params.chatStatus === "ready" || params.chatStatus === "error" || params.chatStatus == null) {
    return true;
  }

  return !params.hasStreamingRegistryChat;
}
