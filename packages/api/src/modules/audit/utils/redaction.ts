import { createHash } from "node:crypto";

const SECRET_KEYS = /authorization|cookie|set-cookie|password|passwd|secret|token|api[-_]?key|credential|private[-_]?key/i;
const PII_KEYS = /email|phone|mobile|address|ssn|id[-_]?number/i;

export type RedactionOptions = { maxDepth?: number; maxStringLength?: number };

export function digestPayload(value: unknown): string {
    return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function redactPayload(value: unknown, options: RedactionOptions = {}, depth = 0): unknown {
    const maxDepth = options.maxDepth ?? 8;
    const maxStringLength = options.maxStringLength ?? 512;
    if (depth > maxDepth) return "[REDACTED_DEPTH]";
    if (typeof value === "string") return value.length > maxStringLength ? `${value.slice(0, maxStringLength)}…[TRUNCATED]` : value;
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => redactPayload(item, options, depth + 1));
    if (!value || typeof value !== "object") return value;
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 200)) {
        if (SECRET_KEYS.test(key)) result[key] = "[REDACTED_SECRET]";
        else if (PII_KEYS.test(key)) result[key] = typeof item === "string" ? `${item.slice(0, 2)}***` : "[REDACTED_PII]";
        else result[key] = redactPayload(item, options, depth + 1);
    }
    return result;
}

export function redactAndDigest(value: unknown, options?: RedactionOptions) {
    const redacted = redactPayload(value, options);
    return { redacted, digest: digestPayload(value) };
}
