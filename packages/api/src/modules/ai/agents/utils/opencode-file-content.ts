export type NormalizedOpencodeFileContent = {
    path: string;
    type: "text" | "binary";
    content: string;
    encoding?: string;
    mimeType?: string;
};

export function normalizeOpencodeFileContentPayload(
    value: unknown,
    requestedPath: string,
): NormalizedOpencodeFileContent {
    if (!value || typeof value !== "object") {
        throw new Error("OpenCode file content returned unexpected payload");
    }
    const body = value as Record<string, unknown>;
    const content =
        typeof body.content === "string"
            ? body.content
            : typeof body.text === "string"
              ? body.text
              : null;
    if (content === null) {
        throw new Error("OpenCode file content returned unexpected payload");
    }

    const type = body.type === "binary" ? "binary" : "text";
    if (type === "binary" && body.encoding !== "base64") {
        throw new Error("OpenCode binary file content must use Base64 encoding");
    }

    return {
        path: typeof body.path === "string" ? body.path : requestedPath,
        type,
        content,
        encoding: typeof body.encoding === "string" ? body.encoding : undefined,
        mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    };
}
