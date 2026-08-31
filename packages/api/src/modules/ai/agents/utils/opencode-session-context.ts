import type { SensitiveWordConfig } from "@buildingai/types/ai/agent-config.interface";

import { createSensitiveWordFilter } from "./sensitive-word-filter";

export const OPENCODE_BUILDINGAI_CONTEXT_METADATA_KEY = "buildingai.systemContext";
const MAX_CONTEXT_LENGTH = 24_000;
const SECRET_KEY_PATTERN = /(password|passwd|pwd|token|secret|api[_-]?key|authorization|credential|密码)/i;

type SessionContextInput = {
    userId?: string | null;
    username?: string | null;
    personalParams?: Record<string, unknown> | null;
    sensitiveWordConfig?: SensitiveWordConfig | null;
    agentId?: string;
};

function stringifyValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (value == null) return "";
    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

const INLINE_SECRET_PATTERNS = [
    /((?:密码|password|passwd|pwd|token|secret|api[_-]?key|authorization)\s*(?:是|为|[:=])\s*)([^\s,，;；]+)/gi,
    /([?&](?:password|passwd|pwd|token|secret|api[_-]?key|authorization)=)[^&#\s]+/gi,
];

export function sanitizeOpencodePersonalParamValue(key: string, value: unknown): string {
    // Do not forward account credentials even when an administrator forgot to add a rule.
    if (SECRET_KEY_PATTERN.test(key)) return "[masked]";
    return INLINE_SECRET_PATTERNS.reduce(
        (result, pattern) => result.replace(pattern, (_match, prefix: string) => `${prefix}[masked]`),
        stringifyValue(value),
    );
}

export function buildOpencodeSessionContext(input: SessionContextInput): string | undefined {
    const username = input.username?.trim();
    const params = Object.entries(input.personalParams ?? {}).filter(([key]) => key.trim());
    const userId = input.userId?.trim();
    if (!userId && !username && params.length === 0) return undefined;

    const lines = [
        "## Bowi AI session context",
        "The following context was provided by the authenticated Bowi AI session. Use it when relevant; do not expose masked values.",
    ];
    if (userId) lines.push(`- login user id: ${userId}`);
    if (username) lines.push(`- login username: ${username}`);
    if (params.length > 0) {
        lines.push("## Bowi AI personal parameters");
        for (const [rawKey, value] of params) {
            const key = rawKey.trim();
            lines.push(`- ${key}: ${sanitizeOpencodePersonalParamValue(key, value)}`);
        }
    }

    const filter = createSensitiveWordFilter(input.sensitiveWordConfig, input.agentId);
    const filtered = filter.filterText(lines.join("\n"));
    if (!filtered.trim()) return undefined;
    return filtered.length > MAX_CONTEXT_LENGTH
        ? `${filtered.slice(0, MAX_CONTEXT_LENGTH)}\n[context truncated]`
        : filtered;
}
