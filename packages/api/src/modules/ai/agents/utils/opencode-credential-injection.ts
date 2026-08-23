export const DEFAULT_OPENCODE_INTERNAL_KEY =
    process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY?.trim() || "buildingai-local-opencode";

const SAP_CONNECTION_TOOL_PATTERN = /(?:^|[_-])sap(?:[_-]pyrfc)?[_-](?:sap[_-])?connect$/i;
const SECRET_KEY_PATTERN = /^(?:password|passwd|pwd|sap[_-]?password|密码)$/i;
const PASSWORD_ASSIGNMENT_PATTERN =
    /(?:^|[?&\s,;，；|"'`])(?:password|passwd|pwd|sap[_-]?password|密码)\s*["'`]?\s*(?:=|:|是|为)\s*["'`]?([^&#\s,;，；|"'`]+)/iu;

export type OpencodeCredentialResolutionInput = {
    toolName: string;
    arguments: Record<string, unknown>;
    personalParams?: Record<string, unknown> | null;
};

export function isOpencodeSapConnectionTool(toolName: string): boolean {
    return SAP_CONNECTION_TOOL_PATTERN.test(toolName.trim());
}

export function isMaskedOpencodeCredential(value: unknown): boolean {
    if (typeof value !== "string") return value == null;
    const normalized = value.trim().toLowerCase();
    return (
        !normalized ||
        normalized === "[masked]" ||
        normalized === "[redacted]" ||
        normalized === "<masked>" ||
        normalized === "***" ||
        normalized === "****"
    );
}

function extractFromValue(value: unknown, key?: string): string | undefined {
    if (typeof value === "string") {
        if (key && SECRET_KEY_PATTERN.test(key) && !isMaskedOpencodeCredential(value)) {
            return value.trim();
        }
        const match = value.match(PASSWORD_ASSIGNMENT_PATTERN);
        const candidate = match?.[1]?.trim();
        return candidate && !isMaskedOpencodeCredential(candidate) ? candidate : undefined;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const result = extractFromValue(item);
            if (result) return result;
        }
        return undefined;
    }
    if (!value || typeof value !== "object") return undefined;
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
        const result = extractFromValue(nestedValue, nestedKey);
        if (result) return result;
    }
    return undefined;
}

export function extractOpencodePassword(
    personalParams?: Record<string, unknown> | null,
): string | undefined {
    return extractFromValue(personalParams);
}

export function resolveOpencodeCredentialOverrides(
    input: OpencodeCredentialResolutionInput,
): Record<string, string> {
    if (!isOpencodeSapConnectionTool(input.toolName)) return {};

    const argumentPasswordKey = Object.keys(input.arguments).find((key) =>
        SECRET_KEY_PATTERN.test(key),
    );
    const suppliedPassword = argumentPasswordKey ? input.arguments[argumentPasswordKey] : undefined;
    if (typeof suppliedPassword === "string" && !isMaskedOpencodeCredential(suppliedPassword)) {
        return {};
    }

    const password = extractOpencodePassword(input.personalParams);
    if (!password) return {};
    return { [argumentPasswordKey ?? "password"]: password };
}
