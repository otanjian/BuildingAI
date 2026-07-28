export type UiMessagePartLike = {
    type: string;
    text?: string;
    url?: string;
    mediaType?: string;
    filename?: string;
};

export type OpencodeTextPartInput = {
    type: "text";
    text: string;
};

export type OpencodeFilePartInput = {
    type: "file";
    mime: string;
    url: string;
    filename?: string;
};

export type OpencodePromptPartInput = OpencodeTextPartInput | OpencodeFilePartInput;

export class OpencodeAttachmentForwardError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OpencodeAttachmentForwardError";
    }
}

export type MapUiPartsOptions = {
    /** Public app origin, e.g. https://ai.bosofts.com — used to rewrite localhost upload URLs */
    appDomain?: string;
};

function isImageMediaType(mediaType?: string): boolean {
    return typeof mediaType === "string" && mediaType.startsWith("image/");
}

function isLocalhostHostname(hostname: string): boolean {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function normalizeAppDomain(appDomain?: string): string | undefined {
    const raw = appDomain?.trim();
    if (!raw) return undefined;
    try {
        const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
        return new URL(withProtocol).origin;
    } catch {
        return undefined;
    }
}

/**
 * Rewrite localhost / 127.0.0.1 upload URLs onto APP_DOMAIN so OpenCode can fetch them.
 * Returns the original URL when already public http(s).
 */
export function resolveOpencodeFileUrl(
    url: string,
    options: MapUiPartsOptions = {},
): string {
    const trimmed = url.trim();
    if (!trimmed) {
        throw new OpencodeAttachmentForwardError(
            "Image attachment is missing a URL and cannot be forwarded to OpenCode",
        );
    }

    if (trimmed.startsWith("blob:")) {
        throw new OpencodeAttachmentForwardError(
            "Image attachment still uses a blob: URL; upload must complete before OpenCode can see it",
        );
    }

    // data: URLs are self-contained; OpenCode FilePart.url accepts a string URI.
    if (trimmed.startsWith("data:")) {
        return trimmed;
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        throw new OpencodeAttachmentForwardError(
            `Image attachment URL is not valid and cannot be forwarded: ${trimmed.slice(0, 120)}`,
        );
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new OpencodeAttachmentForwardError(
            `Image attachment URL scheme is not supported for OpenCode: ${parsed.protocol}`,
        );
    }

    if (!isLocalhostHostname(parsed.hostname)) {
        return trimmed;
    }

    const origin = normalizeAppDomain(options.appDomain);
    if (!origin) {
        throw new OpencodeAttachmentForwardError(
            "Image attachment uses a localhost URL but APP_DOMAIN is not configured to rewrite it",
        );
    }

    return `${origin}${parsed.pathname}${parsed.search}`;
}

/**
 * Map BuildingAI UIMessage parts to OpenCode prompt_async parts (text + image file parts).
 */
export function mapUiPartsToOpencodePromptParts(
    parts: UiMessagePartLike[] | undefined | null,
    options: MapUiPartsOptions = {},
): { text: string; parts: OpencodePromptPartInput[] } {
    const list = Array.isArray(parts) ? parts : [];
    const textChunks: string[] = [];
    const fileParts: OpencodeFilePartInput[] = [];

    for (const part of list) {
        if (part.type === "text" && typeof part.text === "string" && part.text.length > 0) {
            textChunks.push(part.text);
            continue;
        }

        if (part.type !== "file") continue;
        if (!isImageMediaType(part.mediaType)) continue;

        const url = resolveOpencodeFileUrl(String(part.url ?? ""), options);
        const mime = part.mediaType as string;
        const filePart: OpencodeFilePartInput = { type: "file", mime, url };
        if (part.filename?.trim()) {
            filePart.filename = part.filename.trim();
        }
        fileParts.push(filePart);
    }

    const text = textChunks.join("");
    const promptParts: OpencodePromptPartInput[] = [];
    if (text.trim()) {
        promptParts.push({ type: "text", text });
    }
    promptParts.push(...fileParts);

    if (promptParts.length === 0) {
        throw new OpencodeAttachmentForwardError(
            "OpenCode prompt cannot be empty: provide text and/or an image attachment",
        );
    }

    return { text, parts: promptParts };
}
