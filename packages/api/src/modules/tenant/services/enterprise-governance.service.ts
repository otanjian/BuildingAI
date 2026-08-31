import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { HttpErrorFactory } from "@buildingai/errors";

export interface ScimReconciliationEvent {
    externalEventId: string;
    action: "create" | "update" | "disable";
    payload: Record<string, unknown>;
}

export interface BreakGlassRequest {
    actorId: string;
    reason: string;
    expiresAt: Date;
    auditEventId: string;
}

export interface RetentionSimulationRecord {
    id: string;
    createdAt: Date;
    classification: string;
}

@Injectable()
export class EnterpriseGovernanceService {
    reconcileScim(events: ScimReconciliationEvent[], options: { dryRun?: boolean } = {}) {
        const seen = new Set<string>();
        const result = events
            .filter((event) => {
                if (!event.externalEventId || seen.has(event.externalEventId)) return false;
                seen.add(event.externalEventId);
                return true;
            })
            .map((event) => ({
                ...event,
                status: options.dryRun ? ("dry_run" as const) : ("pending" as const),
            }));
        return {
            dryRun: Boolean(options.dryRun),
            events: result,
            cursor: result.at(-1)?.externalEventId ?? null,
        };
    }

    validateBreakGlass(request: BreakGlassRequest, now = new Date()): void {
        if (!request.actorId || !request.auditEventId || request.reason.trim().length < 10) {
            throw HttpErrorFactory.forbidden(
                "Break-glass requires actor, audit event and a reason",
            );
        }
        const ttl = request.expiresAt.getTime() - now.getTime();
        if (ttl <= 0 || ttl > 60 * 60_000)
            throw HttpErrorFactory.forbidden("Break-glass expiry must be within one hour");
    }

    maskPayload(value: unknown, classification: string): unknown {
        if (classification !== "restricted") return value;
        if (typeof value === "string") return "[REDACTED]";
        if (Array.isArray(value)) return value.map(() => "[REDACTED]");
        if (value && typeof value === "object")
            return Object.fromEntries(
                Object.keys(value as object).map((key) => [key, "[REDACTED]"]),
            );
        return value;
    }

    isDeletionBlockedByLegalHold(
        holds: Array<{ status: string; scope?: Record<string, unknown> }>,
        target: Record<string, unknown>,
    ): boolean {
        return holds.some(
            (hold) =>
                hold.status === "active" &&
                Object.entries(hold.scope ?? {}).every(([key, value]) => target[key] === value),
        );
    }

    /**
     * Computes an in-memory retention preview without mutating records. This is
     * used by rollout dry-runs before an asynchronous deletion job is scheduled.
     */
    simulateRetention(
        records: RetentionSimulationRecord[],
        retentionDays: number,
        now = new Date(),
        holds: Array<{ status: string; scope?: Record<string, unknown> }> = [],
    ) {
        const cutoff = now.getTime() - Math.max(0, retentionDays) * 86_400_000;
        const expired = records.filter((record) => record.createdAt.getTime() < cutoff);
        const held = expired.filter((record) =>
            this.isDeletionBlockedByLegalHold(holds, { recordId: record.id }),
        );
        const deletable = expired.filter((record) => !held.includes(record));
        return {
            cutoff: new Date(cutoff),
            scanned: records.length,
            expired: expired.length,
            held: held.length,
            deletable: deletable.length,
            deletableIds: deletable.map((record) => record.id),
        };
    }

    buildCompletionManifest(
        tenantId: string,
        jobId: string,
        records: Array<Record<string, unknown>>,
    ) {
        const canonical = JSON.stringify(
            records
                .map((record): Record<string, unknown> =>
                    Object.keys(record)
                        .sort()
                        .reduce<Record<string, unknown>>((out, key) => ({ ...out, [key]: record[key] }), {}),
                )
                .sort((left, right) => String(left.id ?? "").localeCompare(String(right.id ?? ""))),
        );
        return {
            tenantId,
            jobId,
            recordCount: records.length,
            manifestHash: createHash("sha256").update(canonical).digest("hex"),
            completedAt: new Date(),
            evidence: records.map((record) => ({ id: record.id ?? null, deleted: true })),
        };
    }
}
