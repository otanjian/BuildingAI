/**
 * After a conversation focus switch, `pendingClear` skips importing one frame of
 * stale stream messages. With ConversationChatRegistry, the rebound Chat often
 * already holds live user/assistant parts — those MUST be imported.
 */
export function resolvePendingClearForStreamImport(params: {
  pendingClear: boolean;
  streamMessageCount: number;
}): { pendingClear: boolean; shouldImport: boolean } {
  if (params.streamMessageCount === 0) {
    return { pendingClear: false, shouldImport: false };
  }
  if (params.pendingClear) {
    // Live registry messages arrived for the focused conversation.
    return { pendingClear: false, shouldImport: true };
  }
  return { pendingClear: false, shouldImport: true };
}
