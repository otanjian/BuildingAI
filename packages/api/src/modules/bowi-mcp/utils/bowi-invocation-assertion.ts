import { createHmac, timingSafeEqual } from "node:crypto";

import {
    BOWI_CAPABILITIES,
    type BowiAuthSource,
    type BowiAutomationScope,
    type BowiCapability,
} from "../types/bowi-mcp.types";

const ASSERTION_AUDIENCE = "bowi-mcp";
const DEFAULT_TTL_SECONDS = 120;

export interface BowiInvocationClaims {
    audience: typeof ASSERTION_AUDIENCE;
    userId: string;
    agentId: string;
    tenantId?: string;
    conversationId?: string;
    authSource: BowiAuthSource;
    capabilities: BowiCapability[];
    issuedAt: number;
    expiresAt: number;
    nonce: string;
    automationScope?: BowiAutomationScope;
}

function secret(): string {
    const value = process.env.BOWI_MCP_INVOCATION_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (!value) throw new Error("BOWI_MCP_INVOCATION_SECRET is not configured");
    return value;
}

function sign(payload: string): string {
    return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createBowiInvocationAssertion(input: {
    userId: string;
    agentId: string;
    tenantId?: string;
    conversationId?: string;
    authSource: BowiAuthSource;
    capabilities?: BowiCapability[];
    now?: number;
    ttlSeconds?: number;
    nonce?: string;
    automationScope?: BowiAutomationScope;
}): string {
    const issuedAt = input.now ?? Math.floor(Date.now() / 1000);
    const claims: BowiInvocationClaims = {
        audience: ASSERTION_AUDIENCE,
        userId: input.userId,
        agentId: input.agentId,
        ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        authSource: input.authSource,
        capabilities: [...new Set(input.capabilities ?? [])].filter((capability) =>
            (BOWI_CAPABILITIES as readonly string[]).includes(capability),
        ),
        issuedAt,
        expiresAt: issuedAt + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS),
        nonce: input.nonce ?? `${issuedAt}-${Math.random().toString(36).slice(2)}`,
        ...(input.automationScope ? { automationScope: input.automationScope } : {}),
    };
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${sign(payload)}`;
}

export function verifyBowiInvocationAssertion(assertion: string, now = Math.floor(Date.now() / 1000)) {
    const [payload, signature, extra] = assertion.split(".");
    if (!payload || !signature || extra) throw new Error("Invalid Bowi invocation assertion");
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        throw new Error("Invalid Bowi invocation assertion");
    }
    let claims: BowiInvocationClaims;
    try {
        claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    } catch {
        throw new Error("Invalid Bowi invocation assertion");
    }
    if (
        claims.audience !== ASSERTION_AUDIENCE ||
        typeof claims.userId !== "string" ||
        typeof claims.agentId !== "string" ||
        (claims.tenantId !== undefined && typeof claims.tenantId !== "string") ||
        !["login", "publish_key", "site_access_token", "anonymous"].includes(
            claims.authSource,
        ) ||
        !Array.isArray(claims.capabilities) ||
        claims.capabilities.some(
            (capability) => !(BOWI_CAPABILITIES as readonly string[]).includes(capability),
        ) ||
        !Number.isInteger(claims.issuedAt) ||
        !Number.isInteger(claims.expiresAt) ||
        claims.issuedAt > now + 30 ||
        claims.expiresAt < now
    ) {
        throw new Error("Invalid or expired Bowi invocation assertion");
    }
    if (claims.automationScope) {
        const scope = claims.automationScope;
        if (
            !scope ||
            typeof scope.channel !== "string" ||
            !scope.channel.trim() ||
            typeof scope.accountId !== "string" ||
            !scope.accountId.trim() ||
            typeof scope.conversationId !== "string" ||
            !scope.conversationId.trim() ||
            !["chat", "user"].includes(scope.targetType) ||
            typeof scope.targetId !== "string" ||
            !scope.targetId.trim() ||
            (scope.tenantId !== undefined && typeof scope.tenantId !== "string") ||
            (scope.mentionAll !== undefined && typeof scope.mentionAll !== "boolean") ||
            (scope.failureTargetId !== undefined && typeof scope.failureTargetId !== "string")
        ) {
            throw new Error("Invalid automation scope");
        }
    }
    return claims;
}
