/**
 * Bowi AI conversation metadata for detached OpenCode turns.
 */

export type OpencodeTurnStatus =
    | "running"
    | "completed"
    | "aborted"
    | "timed_out"
    | "persist_failed"
    | "recovered";

const STATUSES = new Set<string>([
    "running",
    "completed",
    "aborted",
    "timed_out",
    "persist_failed",
    "recovered",
]);

export function readOpencodeTurnStatus(
    metadata: Record<string, unknown> | null | undefined,
): OpencodeTurnStatus | undefined {
    const value = metadata?.opencodeTurnStatus;
    if (typeof value !== "string" || !STATUSES.has(value)) return undefined;
    return value as OpencodeTurnStatus;
}

export function isOpencodeTurnRunning(
    metadata: Record<string, unknown> | null | undefined,
): boolean {
    return readOpencodeTurnStatus(metadata) === "running";
}

export function mergeOpencodeTurnMetadata(
    existing: Record<string, unknown> | null | undefined,
    update: { status: OpencodeTurnStatus; at: string },
): Record<string, unknown> {
    const next: Record<string, unknown> = { ...(existing ?? {}) };
    next.opencodeTurnStatus = update.status;
    if (update.status === "running") {
        next.opencodeTurnStartedAt = update.at;
        delete next.opencodeTurnEndedAt;
    } else {
        next.opencodeTurnEndedAt = update.at;
    }
    return next;
}
