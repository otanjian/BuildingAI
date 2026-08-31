function toBase64Url(value: string): string {
    const bytes = new TextEncoder().encode(value);
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return Buffer.from(binary, "binary").toString("base64url");
}

/** OpenCode Web's server route uses the canonical, credential-free runtime URL. */
export function normalizeOpencodeEmbedOrigin(value: string): string {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("OpenCode baseURL must use http or https");
    }
    if (parsed.username || parsed.password) {
        parsed.username = "";
        parsed.password = "";
    }
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
}

export function encodeOpencodeServerKey(baseURL: string): string {
    return toBase64Url(normalizeOpencodeEmbedOrigin(baseURL));
}

function normalizeHttpOrigin(value: string | undefined): string | undefined {
    if (!value?.trim()) return undefined;
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return undefined;
        if (parsed.username || parsed.password) return undefined;
        return parsed.origin;
    } catch {
        return undefined;
    }
}

export function resolveBuildingAIWebOrigin(input: {
    origin?: string;
    referer?: string;
    configuredWebOrigin?: string;
}): string {
    const origin = normalizeHttpOrigin(input.origin);
    if (origin) return origin;
    const referer = normalizeHttpOrigin(input.referer);
    if (referer) return referer;
    const configured = normalizeHttpOrigin(input.configuredWebOrigin);
    if (configured) return configured;
    return `http://127.0.0.1:${process.env.CLIENT_DEV_PORT?.trim() || "4091"}`;
}

export function buildBuildingAIReportBase(
    webOrigin: string,
    agentId: string,
    conversationId: string,
): string {
    const origin = normalizeHttpOrigin(webOrigin);
    if (!origin) throw new Error("Bowi AI web origin must use http or https");
    return `${origin}/agents/${encodeURIComponent(agentId)}/c/${encodeURIComponent(conversationId)}/reports/`;
}

export function buildOpencodeEmbedUrl(
    baseURL: string,
    sessionId: string,
    context?: { reportBase?: string; artifactRoot?: string },
): string {
    const origin = normalizeOpencodeEmbedOrigin(baseURL);
    const url = new URL(
        `${origin}/server/${encodeOpencodeServerKey(origin)}/session/${encodeURIComponent(sessionId)}`,
    );
    url.searchParams.set("buildingaiEmbed", "1");
    if (context?.reportBase) {
        url.searchParams.set("buildingaiReportBase", context.reportBase);
    }
    if (context?.artifactRoot) {
        url.searchParams.set("buildingaiArtifactRoot", context.artifactRoot);
    }
    return url.toString();
}

export function buildOpencodeEmbedUrlWithDirectory(
    baseURL: string,
    sessionId: string,
    workspace: string,
): string {
    const url = new URL(buildOpencodeEmbedUrl(baseURL, sessionId));
    url.searchParams.set("directory", workspace);
    return url.toString();
}
