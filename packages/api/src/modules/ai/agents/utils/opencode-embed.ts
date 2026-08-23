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

export function buildOpencodeEmbedUrl(baseURL: string, sessionId: string): string {
    const origin = normalizeOpencodeEmbedOrigin(baseURL);
    const url = new URL(
        `${origin}/server/${encodeOpencodeServerKey(origin)}/session/${encodeURIComponent(sessionId)}`,
    );
    url.searchParams.set("buildingaiEmbed", "1");
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
