import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "bcmk_";
const DISPLAY_PREFIX_LENGTH = 12;

/**
 * Generate a Console MCP API key secret (shown once on create).
 */
export function generateConsoleMcpApiKey(): string {
    return `${KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
}

/**
 * Hash a Console MCP API key for storage and lookup (SHA-256 hex).
 */
export function hashConsoleMcpApiKey(rawKey: string): string {
    return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Stable display prefix for list UI (not the full secret).
 */
export function prefixConsoleMcpApiKey(rawKey: string): string {
    return rawKey.slice(0, DISPLAY_PREFIX_LENGTH);
}
