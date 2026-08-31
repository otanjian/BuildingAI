/**
 * Headless OpenCode permission asks — Bowi AI must reply or the turn hangs.
 */

export type OpencodePermissionAsk = {
    requestId: string;
    sessionId: string;
};

export function extractOpencodePermissionAsk(event: {
    type: string;
    properties?: Record<string, any>;
}): OpencodePermissionAsk | undefined {
    if (event.type !== "permission.asked" && event.type !== "permission.v2.asked") {
        return undefined;
    }
    const requestId = String(event.properties?.id ?? "").trim();
    const sessionId = String(event.properties?.sessionID ?? "").trim();
    if (!requestId || !sessionId) return undefined;
    return { requestId, sessionId };
}

/**
 * A session waiting on a permission prompt is not hung — aborting it
 * would turn a two-conversation switch into `Aborted`.
 */
export function shouldAbortStuckSession(params: {
    isStuck: boolean;
    pendingPermissionCount: number;
}): boolean {
    return params.isStuck && params.pendingPermissionCount <= 0;
}
