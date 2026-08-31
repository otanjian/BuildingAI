jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        forbidden: (message: string) => new Error(message),
    },
}));

import { EnterpriseGovernanceService } from "./enterprise-governance.service";

describe("EnterpriseGovernanceService", () => {
    const service = new EnterpriseGovernanceService();

    it("deduplicates SCIM events and supports dry-run reconciliation", () => {
        const result = service.reconcileScim(
            [
                { externalEventId: "1", action: "update", payload: {} },
                { externalEventId: "1", action: "update", payload: {} },
                { externalEventId: "2", action: "disable", payload: {} },
            ],
            { dryRun: true },
        );
        expect(result.events).toHaveLength(2);
        expect(result.events[0].status).toBe("dry_run");
        expect(result.cursor).toBe("2");
    });

    it("enforces bounded break-glass expiry and audit reason", () => {
        expect(() =>
            service.validateBreakGlass({
                actorId: "u",
                reason: "short",
                auditEventId: "a",
                expiresAt: new Date(Date.now() + 60_000),
            }),
        ).toThrow();
        expect(() =>
            service.validateBreakGlass({
                actorId: "u",
                reason: "Emergency production recovery",
                auditEventId: "a",
                expiresAt: new Date(Date.now() + 2 * 60 * 60_000),
            }),
        ).toThrow();
    });

    it("masks restricted payloads and blocks records under legal hold", () => {
        expect(service.maskPayload({ email: "a@example.com" }, "restricted")).toEqual({
            email: "[REDACTED]",
        });
        expect(
            service.isDeletionBlockedByLegalHold([{ status: "active", scope: { userId: "u1" } }], {
                userId: "u1",
            }),
        ).toBe(true);
        expect(
            service.isDeletionBlockedByLegalHold(
                [{ status: "released", scope: { userId: "u1" } }],
                { userId: "u1" },
            ),
        ).toBe(false);
    });

    it("builds a verifiable deletion completion manifest", () => {
        const first = service.buildCompletionManifest("tenant-a", "job-1", [
            { id: "r2", email: "b@example.com" },
            { email: "a@example.com", id: "r1" },
        ]);
        const reordered = service.buildCompletionManifest("tenant-a", "job-1", [
            { email: "a@example.com", id: "r1" },
            { email: "b@example.com", id: "r2" },
        ]);

        expect(first.recordCount).toBe(2);
        expect(first.manifestHash).toMatch(/^[a-f0-9]{64}$/);
        expect(first.manifestHash).toBe(reordered.manifestHash);
        expect(first.evidence).toEqual([
            { id: "r2", deleted: true },
            { id: "r1", deleted: true },
        ]);
    });

    it("simulates retention without mutation and honors legal holds", () => {
        const now = new Date("2026-01-31T00:00:00Z");
        const records = [
            { id: "old-1", classification: "internal", createdAt: new Date("2025-12-01T00:00:00Z") },
            { id: "old-2", classification: "restricted", createdAt: new Date("2025-12-15T00:00:00Z") },
            { id: "fresh", classification: "internal", createdAt: new Date("2026-01-20T00:00:00Z") },
        ];
        const result = service.simulateRetention(records, 30, now, [
            { status: "active", scope: { recordId: "old-2" } },
        ]);
        expect(result).toMatchObject({ scanned: 3, expired: 2, held: 1, deletable: 1 });
        expect(result.deletableIds).toEqual(["old-1"]);
        expect(records).toHaveLength(3);
    });
});
