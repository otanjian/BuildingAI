jest.mock("@buildingai/db/entities", () => ({ AuditEvent: class {}, AuditOutbox: class {}, BudgetPolicy: class {}, CostLedger: class {}, UsageEvent: class {} }));
jest.mock("@buildingai/db/typeorm", () => ({ Repository: class {} }));
import { AuditGovernanceService } from "./audit-governance.service";

function repository<T extends Record<string, any>>(seed: T[] = []) {
    const rows = [...seed];
    return {
        rows,
        create: jest.fn((value: T) => value),
        save: jest.fn(async (value: T) => {
            const row = { id: value.id || `id-${rows.length + 1}`, createdAt: value.createdAt || new Date(), ...value } as T;
            rows.push(row);
            return row;
        }),
        find: jest.fn(async ({ where } = {} as any) => where ? rows.filter((row) => Object.entries(where).every(([key, value]) => row[key] === value)) : rows),
        findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => rows.find((row) => Object.entries(where).every(([key, value]) => row[key] === value))),
    };
}

describe("audit governance durability and reconciliation", () => {
    it("keeps correlation and redaction data while retrying a transient outbox failure", async () => {
        const audits = repository<any>();
        const outbox = repository<any>();
        const usages = repository<any>();
        const ledger = repository<any>();
        const budgets = repository<any>();
        let failures = 0;
        outbox.save.mockImplementation(async (value: any) => {
            if (failures++ < 2) throw new Error("sink unavailable");
            outbox.rows.push(value);
            return value;
        });
        const service = new AuditGovernanceService(audits as any, outbox as any, usages as any, ledger as any, budgets as any);

        const saved = await service.recordAudit({
            tenantId: "tenant-a",
            action: "tool.execution",
            context: { requestId: "req-1", correlationId: "corr-1", projectId: "project-a" },
            payload: { authorization: "Bearer secret", email: "alice@example.com", tool: "search" },
        });

        expect(saved.correlationId).toBe("corr-1");
        expect(saved.metadata.payload).toMatchObject({ authorization: "[REDACTED_SECRET]", email: "al***", tool: "search" });
        expect(outbox.save).toHaveBeenCalledTimes(3);
        expect(outbox.rows).toHaveLength(1);
    });

    it("fails closed when durable outbox acceptance cannot be established", async () => {
        const audits = repository<any>();
        const outbox = repository<any>();
        outbox.save.mockRejectedValue(new Error("database unavailable"));
        const service = new AuditGovernanceService(audits as any, outbox as any, repository() as any, repository() as any, repository() as any);

        await expect(service.recordAudit({ tenantId: "tenant-a", action: "authorization" })).rejects.toThrow("database unavailable");
        expect(outbox.save).toHaveBeenCalledTimes(3);
    });

    it("applies the strictest matching quota and replays idempotently", async () => {
        const now = new Date("2026-08-30T00:00:00Z");
        const budgets = repository<any>([
            { id: "tenant-policy", tenantId: "tenant-a", scope: "tenant", scopeId: "tenant-a", enabled: true, periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-12-31"), softLimit: "80", hardLimit: "100" },
            { id: "project-policy", tenantId: "tenant-a", scope: "project", scopeId: "project-a", enabled: true, periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-12-31"), softLimit: "40", hardLimit: "50" },
        ]);
        const ledger = repository<any>([{ tenantId: "tenant-a", state: "settled", settledAmount: "49", metadata: { budgetPolicyId: "project-policy" } }]);
        const service = new AuditGovernanceService(repository() as any, repository() as any, repository() as any, ledger as any, budgets as any);
        await expect(service.evaluateBudget({ tenantId: "tenant-a", projectId: "project-a" }, 2, now)).resolves.toMatchObject({ allowed: false, reason: "BUDGET_HARD_LIMIT", applicablePolicyIds: ["tenant-policy", "project-policy"] });

        const usage = repository<any>();
        const replayService = new AuditGovernanceService(repository() as any, repository() as any, usage as any, repository() as any, repository() as any);
        const input = { tenantId: "tenant-a", kind: "model", amount: "1.25", idempotencyKey: "usage-1", requestId: "req-1", correlationId: "corr-1" };
        const first = await replayService.recordUsage(input);
        const second = await replayService.recordUsage(input);
        expect(second).toBe(first);
        expect(usage.save).toHaveBeenCalledTimes(1);
    });

    it("reconciles provider invoice totals by tenant and billing period", async () => {
        const usage = repository<any>([
            { tenantId: "tenant-a", provider: "openai", model: "gpt-4o", amount: "1.20", createdAt: new Date("2026-08-15T00:00:00Z") },
            { tenantId: "tenant-a", provider: "openai", model: "gpt-4o", amount: "0.30", createdAt: new Date("2026-08-16T00:00:00Z") },
            { tenantId: "tenant-b", provider: "openai", model: "gpt-4o", amount: "99", createdAt: new Date("2026-08-16T00:00:00Z") },
        ]);
        const service = new AuditGovernanceService(repository() as any, repository() as any, usage as any, repository() as any, repository() as any);
        const result = await service.reconcileProviderInvoice({ tenantId: "tenant-a", periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), invoiceLines: [{ provider: "openai", model: "gpt-4o", amount: 1.75 }] });
        expect(result).toMatchObject({ invoiceTotal: 1.75, usageTotal: 1.5, delta: 0.25 });
        expect(result.lines[0]).toMatchObject({ usageAmount: 1.5, status: "under" });
    });
});
