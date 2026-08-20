import type { UIMessage } from "ai";

/**
 * Live/stream assistant ids often do not match persisted history ids.
 * Missing parents must not become a new root for a newer assistant turn.
 */
export function resolveImportParentId(params: {
  role: UIMessage["role"];
  requestedParentId: string | null | undefined;
  knownIds: ReadonlySet<string>;
  lastUserId: string | null;
  recordSequence: number;
  headSequence: number | null;
}): string | null {
  const requested = params.requestedParentId ?? null;
  if (requested && params.knownIds.has(requested)) return requested;

  const isNewerThanHead =
    params.headSequence == null || params.recordSequence >= params.headSequence;
  if (
    params.role === "assistant" &&
    isNewerThanHead &&
    params.lastUserId &&
    params.knownIds.has(params.lastUserId)
  ) {
    return params.lastUserId;
  }

  return requested;
}
