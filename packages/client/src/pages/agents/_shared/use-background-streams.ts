import { useSyncExternalStore } from "react";

import { getBackgroundStreamingSnapshot, subscribeBackgroundStreams } from "./background-streams";

/**
 * Returns the set of conversation ids that currently have a background stream
 * in flight (i.e. the user navigated away while the assistant was generating).
 * Re-renders whenever the tracker changes.
 */
export function useBackgroundStreamingConversations(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribeBackgroundStreams,
    getBackgroundStreamingSnapshot,
    getBackgroundStreamingSnapshot,
  );
}
