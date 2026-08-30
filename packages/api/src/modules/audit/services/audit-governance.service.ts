import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AuditEvent, AuditOutbox, BudgetPolicy, CostLedger, UsageEvent } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import { createRequestContext, type RequestContext } from "./request-context";
import { redactAndDigest } from "../utils/redaction";

export type BudgetScopeInput = { tenantId: string; departmentId?: string; projectId?: string; agentId?: string; userId?: string };
export type BudgetDecision = { allowed: boolean; reason?: string; softLimitReached: boolean; applicablePolicyIds: string[] };
export type ProviderInvoiceLine = { provider: string; model: string; amount: number };
export type ReconciliationResult = {
    tenantId: string;
    periodStart: Date;
    periodEnd: Date;
    lines: Array<ProviderInvoiceLine & { usageAmount: number; delta: number; status: "matched" | "under" | "over" }>;
    invoiceTotal: number;
    usageTotal: number;
    delta: number;
};

@Injectable()
export class AuditGovernanceService {
    constructor(
        @InjectRepository(AuditEvent) private readonly auditEvents: Repository<AuditEvent>,
        @InjectRepository(AuditOutbox) private readonly outbox: Repository<AuditOutbox>,
        @InjectRepository(UsageEvent) private readonly usageEvents: Repository<UsageEvent>,
        @InjectRepository(CostLedger) private readonly ledger: Repository<CostLedger>,
        @InjectRepository(BudgetPolicy) private readonly budgets: Repository<BudgetPolicy>,
    ) {}

    async recordAudit(input: Omit<Partial<AuditEvent>, "tenantId"> & { tenantId: string; context?: Partial<RequestContext>; payload?: unknown }) {
        const context = createRequestContext({ ...input.context, tenantId: input.tenantId });
        const { redacted, digest } = redactAndDigest(input.payload ?? input.metadata ?? {});
        const event = this.auditEvents.create({
            tenantId: input.tenantId,
            projectId: input.projectId ?? context.projectId ?? null,
            actorId: input.actorId ?? context.actorId ?? null,
            agentId: input.agentId ?? context.agentId ?? null,
            agentVersionId: input.agentVersionId ?? context.agentVersionId ?? null,
            action: input.action || "unknown",
            outcome: input.outcome || "allowed",
            resourceType: input.resourceType ?? null,
            resourceId: input.resourceId ?? null,
            requestId: context.requestId,
            correlationId: context.correlationId,
            traceId: context.traceId ?? null,
            policyVersion: input.policyVersion ?? null,
            latencyMs: input.latencyMs ?? null,
            metadata: { ...(input.metadata || {}), payload: redacted },
            payloadDigest: digest,
        });
        const saved = await this.auditEvents.save(event);
        const outboxRecord = this.outbox.create({
            tenantId: input.tenantId,
            topic: "audit.event",
            requestId: saved.requestId,
            correlationId: saved.correlationId,
            idempotencyKey: `audit:${saved.id}`,
            payload: { eventId: saved.id, action: saved.action, outcome: saved.outcome, metadata: saved.metadata },
            status: "pending",
            attemptsMade: 0,
            nextAttemptAt: null,
            lastError: null,
            payloadDigest: createHash("sha256").update(JSON.stringify(saved.metadata)).digest("hex"),
        });
        // A transient sink/database error must not silently drop the audit event. Retry
        // a bounded number of times; callers still fail closed when durability cannot
        // be established after the retry budget is exhausted.
        await this.saveWithRetry(() => this.outbox.save(outboxRecord));
        return saved;
    }

    async evaluateBudget(scope: BudgetScopeInput, estimatedAmount: number, now = new Date()): Promise<BudgetDecision> {
        const policies = await this.budgets.find({ where: { tenantId: scope.tenantId, enabled: true } });
        const ids = policies.filter((policy) => policy.periodStart <= now && policy.periodEnd >= now && this.matchesScope(policy.scope, policy.scopeId, scope)).map((policy) => policy.id);
        if (!ids.length) return { allowed: true, softLimitReached: false, applicablePolicyIds: [] };
        const usage = await this.ledger.find({ where: { tenantId: scope.tenantId, state: "settled" } });
        const spent = usage.filter((entry) => ids.includes(entry.metadata?.budgetPolicyId as string)).reduce((sum, entry) => sum + Number(entry.settledAmount || 0), 0);
        const applicable = policies.filter((p) => ids.includes(p.id));
        const hardLimit = Math.min(...applicable.map((p) => Number(p.hardLimit || 0)).filter((value) => value > 0));
        const softLimit = Math.min(...applicable.map((p) => Number(p.softLimit || 0)).filter((value) => value > 0));
        return { allowed: !hardLimit || spent + estimatedAmount <= hardLimit, reason: hardLimit && spent + estimatedAmount > hardLimit ? "BUDGET_HARD_LIMIT" : undefined, softLimitReached: !!softLimit && spent + estimatedAmount >= softLimit, applicablePolicyIds: ids };
    }

    async reserveCost(input: { tenantId: string; amount: number; idempotencyKey: string; requestId: string; correlationId: string; projectId?: string; actorId?: string; metadata?: Record<string, unknown> }) {
        const existing = await this.ledger.findOne({ where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } });
        if (existing) return existing;
        return this.ledger.save(this.ledger.create({ tenantId: input.tenantId, projectId: input.projectId ?? null, actorId: input.actorId ?? null, state: "reserved", reservedAmount: String(input.amount), settledAmount: "0", idempotencyKey: input.idempotencyKey, requestId: input.requestId, correlationId: input.correlationId, metadata: input.metadata || {}, departmentId: null, agentId: null, priceVersion: null }));
    }

    async settleCost(tenantId: string, idempotencyKey: string, amount: number) {
        const entry = await this.ledger.findOne({ where: { tenantId, idempotencyKey } });
        if (!entry) throw new Error("Cost reservation not found");
        if (entry.state === "settled" || entry.state === "reversed") return entry;
        entry.settledAmount = String(amount); entry.state = "settled";
        return this.ledger.save(entry);
    }

    async reverseCost(tenantId: string, idempotencyKey: string) {
        const entry = await this.ledger.findOne({ where: { tenantId, idempotencyKey } });
        if (!entry) throw new Error("Cost reservation not found");
        if (entry.state === "reversed") return entry;
        entry.state = "reversed"; entry.settledAmount = "0";
        return this.ledger.save(entry);
    }

    async recordUsage(input: Omit<Partial<UsageEvent>, "tenantId"> & { tenantId: string; idempotencyKey: string; requestId: string; correlationId: string }) {
        const existing = await this.usageEvents.findOne({ where: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } });
        if (existing) return existing;
        return this.saveWithRetry(() => this.usageEvents.save(this.usageEvents.create({ ...input, departmentId: input.departmentId ?? null, projectId: input.projectId ?? null, agentId: input.agentId ?? null, actorId: input.actorId ?? null, provider: input.provider ?? null, model: input.model ?? null, inputTokens: input.inputTokens ?? 0, outputTokens: input.outputTokens ?? 0, durationMs: input.durationMs ?? 0, quantity: input.quantity ?? "0", amount: input.amount ?? "0", priceVersion: input.priceVersion ?? null, kind: input.kind || "unknown", metadata: input.metadata || {} })));
    }

    async reconcileProviderInvoice(input: { tenantId: string; periodStart: Date; periodEnd: Date; invoiceLines: ProviderInvoiceLine[] }): Promise<ReconciliationResult> {
        const usage = await this.usageEvents.find({ where: { tenantId: input.tenantId } });
        const scoped = usage.filter((event) => {
            const createdAt = event.createdAt ? new Date(event.createdAt) : undefined;
            return !!createdAt && createdAt >= input.periodStart && createdAt <= input.periodEnd;
        });
        const usageByKey = new Map<string, number>();
        for (const event of scoped) {
            const key = `${event.provider || "unknown"}:${event.model || "unknown"}`;
            usageByKey.set(key, (usageByKey.get(key) || 0) + Number(event.amount || 0));
        }
        const lines = input.invoiceLines.map((line) => {
            const usageAmount = usageByKey.get(`${line.provider}:${line.model}`) || 0;
            const delta = Number((line.amount - usageAmount).toFixed(8));
            return { ...line, usageAmount, delta, status: Math.abs(delta) < 0.00000001 ? "matched" as const : delta > 0 ? "under" as const : "over" as const };
        });
        const invoiceTotal = Number(input.invoiceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0).toFixed(8));
        const usageTotal = Number(scoped.reduce((sum, event) => sum + Number(event.amount || 0), 0).toFixed(8));
        return { tenantId: input.tenantId, periodStart: input.periodStart, periodEnd: input.periodEnd, lines, invoiceTotal, usageTotal, delta: Number((invoiceTotal - usageTotal).toFixed(8)) };
    }

    private matchesScope(scope: string, scopeId: string, input: BudgetScopeInput) {
        return (scope === "tenant" && scopeId === input.tenantId) || (scope === "department" && scopeId === input.departmentId) || (scope === "project" && scopeId === input.projectId) || (scope === "agent" && scopeId === input.agentId) || (scope === "user" && scopeId === input.userId);
    }

    private async saveWithRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
        let lastError: unknown;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                if (attempt < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
            }
        }
        throw lastError;
    }
}
