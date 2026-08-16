/** Shared helper: server-backed OpenCode turn generating flag. */
export function isOpencodeTurnRunning(
    metadata: Record<string, unknown> | null | undefined,
): boolean {
    return metadata?.opencodeTurnStatus === "running";
}
