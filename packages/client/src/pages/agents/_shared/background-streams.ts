/**
 * Tracks which agent conversations currently have an in-flight background
 * stream (i.e. the user navigated away while the assistant was still
 * generating). The conversation history list uses this to show a
 * "generating" badge and to refresh once the stream finishes.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let generatingSnapshot: ReadonlySet<string> = new Set();

function emit(): void {
  // Always hand out a fresh Set so external-store snapshots are referentially
  // stable between emissions.
  generatingSnapshot = new Set(generatingSnapshot);
  for (const listener of listeners) {
    listener();
  }
}

export function registerBackgroundStream(conversationId: string): void {
  if (!conversationId) return;
  if (generatingSnapshot.has(conversationId)) return;
  const next = new Set(generatingSnapshot);
  next.add(conversationId);
  generatingSnapshot = next;
  emit();
}

export function unregisterBackgroundStream(conversationId: string | undefined): void {
  if (!conversationId) return;
  if (!generatingSnapshot.has(conversationId)) return;
  const next = new Set(generatingSnapshot);
  next.delete(conversationId);
  generatingSnapshot = next;
  emit();
}

export function isBackgroundStreamGenerating(conversationId: string | undefined): boolean {
  return Boolean(conversationId && generatingSnapshot.has(conversationId));
}

export function getBackgroundStreamingSnapshot(): ReadonlySet<string> {
  return generatingSnapshot;
}

export function subscribeBackgroundStreams(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
