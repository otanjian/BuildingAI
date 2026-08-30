jest.mock("@buildingai/db/entities", () => ({ AuditEvent: class {}, AuditOutbox: class {}, BudgetPolicy: class {}, CostLedger: class {}, UsageEvent: class {} }));
jest.mock("@buildingai/db/typeorm", () => ({ Repository: class {} }));
import { AuditGovernanceService } from "./audit-governance.service";
import { ObservabilityAdapters } from "./observability-adapters";

describe("audit pipeline load and failure drills", () => {
    it("accepts a burst without losing audit/outbox pairs", async () => {
        const auditRows: any[] = [];
        const outboxRows: any[] = [];
        const auditRepo = {
            create: jest.fn((value: any) => value),
            save: jest.fn(async (value: any) => { const row = { ...value, id: `audit-${auditRows.length + 1}`, createdAt: new Date() }; auditRows.push(row); return row; }),
        };
        const outboxRepo = {
            create: jest.fn((value: any) => value),
            save: jest.fn(async (value: any) => { outboxRows.push(value); return value; }),
        };
        const service = new AuditGovernanceService(auditRepo as any, outboxRepo as any, { findOne: jest.fn(), save: jest.fn(), create: jest.fn() } as any, { find: jest.fn(), findOne: jest.fn() } as any, { find: jest.fn() } as any);
        await Promise.all(Array.from({ length: 250 }, (_, index) => service.recordAudit({ tenantId: "tenant-a", action: "model.call", context: { requestId: `req-${index}`, correlationId: "corr-burst" }, payload: { token: "must-not-leak", index } })));
        expect(auditRows).toHaveLength(250);
        expect(outboxRows).toHaveLength(250);
        expect(new Set(outboxRows.map((row) => row.idempotencyKey)).size).toBe(250);
        expect(JSON.stringify(auditRows)).not.toContain("must-not-leak");
    });

    it("bounds high-cardinality metric labels and removes sensitive dimensions", () => {
        const logger = { debug: jest.fn(), log: jest.fn() };
        const adapters = new ObservabilityAdapters();
        (adapters as any).logger = logger;
        for (let index = 0; index < 500; index += 1) adapters.metric("model.tokens", index, { tenantId: `tenant-${index}`, prompt: `secret-${index}`, email: `user-${index}@example.com`, region: "cn" });
        expect(logger.debug).toHaveBeenCalledTimes(500);
        const tenantLabels = new Set(logger.debug.mock.calls.map(([payload]) => JSON.parse(payload).labels.tenantId));
        expect(tenantLabels.size).toBe(101);
        for (const [payload] of logger.debug.mock.calls) {
            const parsed = JSON.parse(payload);
            expect(Object.keys(parsed.labels)).toEqual(["tenantId", "region"]);
            expect(payload).not.toContain("secret-");
            expect(payload).not.toContain("@example.com");
        }
    });

    it("recovers provider usage ingestion after transient provider errors", async () => {
        const usageEvents = { findOne: jest.fn().mockResolvedValue(undefined), create: jest.fn((value: any) => value), save: jest.fn() };
        let attempts = 0;
        usageEvents.save.mockImplementation(async (value: any) => {
            attempts += 1;
            if (attempts < 3) throw new Error("provider timeout");
            return value;
        });
        const service = new AuditGovernanceService({} as any, {} as any, usageEvents as any, {} as any, {} as any);
        await expect(service.recordUsage({ tenantId: "tenant-a", kind: "model", amount: "0.5", idempotencyKey: "provider-1", requestId: "req-1", correlationId: "corr-1" })).resolves.toMatchObject({ tenantId: "tenant-a" });
        expect(usageEvents.save).toHaveBeenCalledTimes(3);
    });
});
