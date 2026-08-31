import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const DEVELOPMENT_OPENCODE_INTERNAL_KEY = "buildingai-local-opencode";
export const OPENCODE_CREDENTIAL_SERVICE_AUDIENCE = "buildingai-opencode-credential";
const SERVICE_TOKEN_TTL_SECONDS = 60;
const consumedServiceTokens = new Map<string, number>();

type OpencodeServiceTokenClaims = {
    aud: string;
    sub: string;
    exp: number;
    iat: number;
    jti: string;
};

function encode(value: unknown): string {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function serviceTokenKey(): string {
    const configured = process.env.BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY?.trim();
    if (process.env.NODE_ENV === "production" && !configured) {
        throw new Error("BUILDINGAI_OPENCODE_SERVICE_TOKEN_KEY must be configured in production");
    }
    return configured || process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY?.trim() || DEVELOPMENT_OPENCODE_INTERNAL_KEY;
}

function signToken(payload: string): string {
    return createHmac("sha256", serviceTokenKey()).update(payload).digest("base64url");
}

/** Create a one-minute audience-bound service token for the internal bridge. */
export function createOpencodeServiceToken(subject = "opencode-worker", now = Math.floor(Date.now() / 1000)): string {
    const claims: OpencodeServiceTokenClaims = {
        aud: OPENCODE_CREDENTIAL_SERVICE_AUDIENCE,
        sub: subject,
        iat: now,
        exp: now + SERVICE_TOKEN_TTL_SECONDS,
        jti: randomUUID(),
    };
    const payload = encode({ alg: "HS256", typ: "BAI-SVC" }) + "." + encode(claims);
    return `${payload}.${signToken(payload)}`;
}

/** Verify audience, expiry and signature before internal credential processing. */
export function verifyOpencodeServiceToken(token: string, now = Math.floor(Date.now() / 1000)): OpencodeServiceTokenClaims {
    const [header, payload, suppliedSignature] = token.split(".");
    if (!header || !payload || !suppliedSignature) throw new Error("Invalid OpenCode service token");
    const expectedSignature = signToken(`${header}.${payload}`);
    const left = Buffer.from(suppliedSignature);
    const right = Buffer.from(expectedSignature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) throw new Error("Invalid OpenCode service token");
    let claims: OpencodeServiceTokenClaims;
    try { claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OpencodeServiceTokenClaims; } catch { throw new Error("Invalid OpenCode service token"); }
    if (claims.aud !== OPENCODE_CREDENTIAL_SERVICE_AUDIENCE || !claims.sub || !claims.jti || !Number.isFinite(claims.exp) || claims.exp <= now || claims.iat > now + 30) {
        throw new Error("Expired or invalid OpenCode service token");
    }
    return claims;
}

/** Verify and consume a one-time service token to prevent replay within its TTL. */
export function consumeOpencodeServiceToken(token: string, now = Math.floor(Date.now() / 1000)): OpencodeServiceTokenClaims {
    const claims = verifyOpencodeServiceToken(token, now);
    for (const [jti, expiresAt] of consumedServiceTokens) if (expiresAt <= now) consumedServiceTokens.delete(jti);
    if (consumedServiceTokens.has(claims.jti)) throw new Error("OpenCode service token replay detected");
    consumedServiceTokens.set(claims.jti, claims.exp);
    return claims;
}

/** Headers used by first-party OpenCode/Bowi clients; no long-lived shared key is emitted. */
export function buildOpencodeServiceHeaders(subject = "opencode-worker", now = Math.floor(Date.now() / 1000)): Record<string, string> {
    return { "x-buildingai-opencode-token": createOpencodeServiceToken(subject, now) };
}

/** Resolve the managed OpenCode key without exposing a predictable production default. */
export function getOpencodeInternalKey(): string {
    const configured = process.env.BUILDINGAI_OPENCODE_INTERNAL_KEY?.trim();
    if (process.env.NODE_ENV === "production") {
        if (!configured || configured === DEVELOPMENT_OPENCODE_INTERNAL_KEY) {
            throw new Error(
                "BUILDINGAI_OPENCODE_INTERNAL_KEY must be configured with a non-default value in production.",
            );
        }
        return configured;
    }
    return configured || DEVELOPMENT_OPENCODE_INTERNAL_KEY;
}

// Kept for development/test compatibility; production callers must use the fail-closed resolver.
export const DEFAULT_OPENCODE_INTERNAL_KEY =
    process.env.NODE_ENV === "production" ? "" : getOpencodeInternalKey();

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
