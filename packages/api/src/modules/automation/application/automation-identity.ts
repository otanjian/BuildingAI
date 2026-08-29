import { createHash } from "node:crypto";

export interface ExternalAutomationIdentity {
    channel: string;
    accountId: string;
    tenantId?: string;
    externalActorId: string;
    /** A verified binding supplied by an authenticated identity provider. */
    localCreatorId?: string;
}

/**
 * Derives a collision-resistant creator scope for channel actors. A provider open_id is only
 * meaningful inside its account/tenant; it must never be used as a global local-user id.
 */
export function deriveAutomationCreatorId(identity: ExternalAutomationIdentity): string {
    if (identity.localCreatorId?.trim()) return identity.localCreatorId.trim();
    const scope = [
        identity.channel,
        identity.accountId,
        identity.tenantId || "-",
        identity.externalActorId,
    ].join("\0");
    return `external:${identity.channel}:${createHash("sha256").update(scope).digest("hex").slice(0, 32)}`;
}
