function decodePathSegment(value: string): string | undefined {
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded || decoded === "." || decoded === "..") return undefined;
    if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("\0")) return undefined;
    return decoded;
  } catch {
    return undefined;
  }
}

export function normalizeReportRelativePath(value: string | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw || raw.startsWith("/") || /^[a-z]:[\\/]/i.test(raw) || raw.includes("\\")) {
    return undefined;
  }

  const segments = raw.split("/").map(decodePathSegment);
  if (segments.some((segment) => !segment)) return undefined;
  const normalized = segments.join("/");
  if (!/\.html?$/i.test(normalized)) return undefined;
  return normalized;
}

function encodePathSegments(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

export function buildConversationArtifactApiPath(input: {
  agentId: string;
  conversationId: string;
  relativePath: string;
}): string | undefined {
  const relativePath = normalizeReportRelativePath(input.relativePath);
  if (!relativePath || !input.agentId || !input.conversationId) return undefined;
  return `/api/ai-agents/${encodeURIComponent(input.agentId)}/conversations/${encodeURIComponent(input.conversationId)}/artifacts/${encodePathSegments(relativePath)}`;
}
