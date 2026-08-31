import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

export interface ScimUserPatch {
    externalId: string;
    userId?: string;
    active?: boolean;
    groups?: string[];
}
export interface ScimSyncResult {
    eventId: string;
    action: "create" | "update" | "disable";
    dryRun: boolean;
    invalidateSessions: boolean;
    revokeCredentials: boolean;
}

@Injectable()
export class EnterpriseScimService {
    syncUser(
        tenantId: string,
        patch: ScimUserPatch,
        options: { dryRun?: boolean } = {},
    ): ScimSyncResult {
        if (!tenantId || !patch.externalId) throw new Error("tenantId and externalId are required");
        const action = patch.active === false ? "disable" : patch.userId ? "update" : "create";
        return {
            eventId: createHash("sha256")
                .update(`${tenantId}:${patch.externalId}:${action}`)
                .digest("hex"),
            action,
            dryRun: Boolean(options.dryRun),
            invalidateSessions: action === "disable",
            revokeCredentials: action === "disable",
        };
    }
}
