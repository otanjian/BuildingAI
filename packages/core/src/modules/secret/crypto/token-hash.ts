import { createHmac, timingSafeEqual } from "node:crypto";

const DEVELOPMENT_TOKEN_HASH_KEY = "buildingai-local-token-hash-key";

function getTokenHashKey(): string {
    const configured = process.env.BUILDINGAI_TOKEN_HASH_KEY?.trim();
    if (process.env.NODE_ENV === "production" && !configured) {
        throw new Error("BUILDINGAI_TOKEN_HASH_KEY must be configured in production");
    }
    return configured || DEVELOPMENT_TOKEN_HASH_KEY;
}

/** Hash inbound publish/API tokens so the token itself is never persisted. */
export function hashInboundToken(token: string): string {
    return createHmac("sha256", getTokenHashKey()).update(token).digest("hex");
}

export function matchesInboundToken(token: string, expectedHash: string | null | undefined): boolean {
    if (!expectedHash) return false;
    const actual = Buffer.from(hashInboundToken(token), "hex");
    const expected = Buffer.from(expectedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}
