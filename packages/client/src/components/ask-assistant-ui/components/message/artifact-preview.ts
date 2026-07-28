const ANON_STORAGE_KEY = "buildingai_anon_id";

export type HtmlArtifactData = {
  kind?: string;
  title?: string;
  relativePath?: string;
  url?: string;
};

export type ArtifactAuthHeaders = {
  Authorization?: string;
  "X-Anonymous-Identifier"?: string;
};

/**
 * Resolve a stored artifact preview path/URL into an absolute fetch URL.
 */
export function resolveArtifactFetchUrl(url: string, apiBaseUrl: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|blob:|data:)/i.test(trimmed)) return trimmed;

  const base = apiBaseUrl.replace(/\/$/, "");
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}

/**
 * Build Authorization + optional anonymous headers for artifact fetch.
 * Prefers published Agent accessToken when on site-chat (so a stale workspace JWT
 * cannot shadow it); otherwise uses session JWT.
 */
export function buildArtifactAuthHeaders(params: {
  sessionToken?: string | null;
  pathname?: string;
  anonymousIdentifier?: string | null;
}): ArtifactAuthHeaders {
  const headers: ArtifactAuthHeaders = {};
  const sessionToken = params.sessionToken?.trim();
  const publishToken = extractPublishAccessToken(params.pathname);
  const bearer = publishToken || sessionToken;
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }

  const anon = params.anonymousIdentifier?.trim();
  if (anon) {
    headers["X-Anonymous-Identifier"] = anon;
  }

  return headers;
}

/** Workspace / console segments that must not be treated as publish accessToken. */
const AGENT_PATH_RESERVED_SEGMENTS = new Set([
  "configuration",
  "publish",
  "logs",
  "monitoring",
  "chat",
  "c",
  "workspace",
  "develop",
]);

export function extractPublishAccessToken(pathname?: string): string | undefined {
  if (!pathname) return undefined;
  // Site-chat only: /agents/:agentId/:accessToken or /agents/:agentId/:accessToken/c/:id
  const match = pathname.match(/^\/agents\/[^/]+\/([^/]+)(?:\/|$)/);
  if (!match?.[1]) return undefined;
  if (AGENT_PATH_RESERVED_SEGMENTS.has(match[1])) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function readAnonymousIdentifierFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined = typeof localStorage !== "undefined"
    ? localStorage
    : undefined,
): string | undefined {
  if (!storage) return undefined;
  const value = storage.getItem(ANON_STORAGE_KEY)?.trim();
  return value || undefined;
}

export function extractHtmlArtifacts(
  parts?: Array<{ type?: string; data?: unknown }>,
): HtmlArtifactData[] {
  if (!parts?.length) return [];
  const seen = new Set<string>();
  const artifacts: HtmlArtifactData[] = [];
  for (const part of parts) {
    if (part.type !== "data-artifact") continue;
    const data = part.data as HtmlArtifactData | undefined;
    if (!data || data.kind !== "html" || !data.url) continue;
    if (seen.has(data.url)) continue;
    seen.add(data.url);
    artifacts.push(data);
  }
  return artifacts;
}

const AUTO_OPEN_STORAGE_PREFIX = "buildingai_html_artifact_auto_opened:";

export function htmlArtifactAutoOpenStorageKey(apiUrl: string): string {
  return `${AUTO_OPEN_STORAGE_PREFIX}${apiUrl}`;
}

/**
 * Whether this artifact URL should attempt auto-open in the current browser session.
 */
export function shouldAutoOpenHtmlArtifact(
  apiUrl: string,
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean {
  if (!apiUrl || !storage) return false;
  return !storage.getItem(htmlArtifactAutoOpenStorageKey(apiUrl));
}

export function markHtmlArtifactAutoOpened(
  apiUrl: string,
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  if (!apiUrl || !storage) return;
  storage.setItem(htmlArtifactAutoOpenStorageKey(apiUrl), "1");
}

export function openHtmlArtifactBlobInNewTab(
  blobUrl: string,
  openWindow: (url: string, target?: string, features?: string) => Window | null = (...args) =>
    window.open(...args),
): Window | null {
  if (!blobUrl) return null;
  const opened = openWindow(blobUrl, "_blank");
  if (opened) {
    try {
      opened.opener = null;
    } catch {
      // ignore cross-context assignment failures
    }
  }
  return opened;
}
