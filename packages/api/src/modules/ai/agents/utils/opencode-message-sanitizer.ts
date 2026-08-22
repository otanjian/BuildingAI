/**
 * PostgreSQL JSONB rejects NUL and other non-whitespace C0 control characters
 * in text values. OpenCode can surface those characters in terminal/tool
 * output, so sanitize the complete message tree immediately before persistence.
 */
const INVALID_JSONB_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function sanitizeValue(value: unknown): unknown {
    if (typeof value === "string") {
        return value.replace(INVALID_JSONB_CONTROL_CHARACTERS, "");
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeValue(item));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, child]) => [
                key.replace(INVALID_JSONB_CONTROL_CHARACTERS, ""),
                sanitizeValue(child),
            ]),
        );
    }
    return value;
}

export function sanitizeOpencodeMessageForPersistence<T>(value: T): T {
    return sanitizeValue(value) as T;
}
