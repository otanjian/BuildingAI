export const OPENCODE_EMBED_MAX_RETRIES = 6;

export function opencodeEmbedRetryDelay(failureCount: number): number {
  return Math.min(250 * 2 ** Math.max(0, failureCount), 2_000);
}

export function shouldRetryOpencodeEmbedSession(failureCount: number, error: unknown): boolean {
  if (failureCount >= OPENCODE_EMBED_MAX_RETRIES) return false;

  const rawStatus =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: unknown }).status
      : undefined;
  const numericStatus = rawStatus == null ? Number.NaN : Number(rawStatus);
  const status = Number.isFinite(numericStatus) ? numericStatus : undefined;

  if (status === 400 || status === 401 || status === 403) return false;
  return status === undefined || status === 404 || status === 409 || status >= 500;
}

export function shouldRefreshOpencodeHistory(
  previousSessionKey: string | undefined,
  currentSessionKey: string | undefined,
): boolean {
  return Boolean(currentSessionKey && currentSessionKey !== previousSessionKey);
}

export function opencodeTitleRefetchInterval(data?: { title?: string | null }): number | false {
  const title = data?.title?.replace(/\s+/g, " ").trim();
  return title === "新对话" || title === "New conversation" ? 1_500 : false;
}

export function shouldRefreshOpencodeTitleHistory(
  previousTitle: string | undefined,
  currentTitle: string | undefined,
  titleSynced: boolean,
): boolean {
  if (!currentTitle || currentTitle === previousTitle) return false;
  if (titleSynced) return true;

  const placeholders = new Set(["新对话", "New conversation"]);
  return Boolean(
    previousTitle && placeholders.has(previousTitle) && !placeholders.has(currentTitle),
  );
}
