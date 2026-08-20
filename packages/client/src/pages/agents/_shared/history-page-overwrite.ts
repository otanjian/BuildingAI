/**
 * History paging must not replace an in-memory live Chat (streaming or
 * rehydrated). Persisted pages use DB ids and can orphan the current turn.
 */
export function shouldApplyHistoryPageToChat(params: {
  shouldLoadInitial: boolean;
  switched: boolean;
  liveMessageCount: number;
}): boolean {
  if (params.liveMessageCount > 0) return false;
  return params.shouldLoadInitial || params.switched;
}
