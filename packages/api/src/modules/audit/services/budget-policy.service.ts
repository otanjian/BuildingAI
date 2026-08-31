import { Injectable } from "@nestjs/common";
import { AuditGovernanceService, type BudgetScopeInput } from "./audit-governance.service";

@Injectable()
export class BudgetPolicyService {
    private readonly active = new Map<string, number>();
    constructor(private readonly governance: AuditGovernanceService) {}

    async authorize(input: BudgetScopeInput & { estimatedAmount: number; operation?: string }) {
        const decision = await this.governance.evaluateBudget(input, input.estimatedAmount);
        if (!decision.allowed) return { ...decision, fallback: "read-only", retryAfterMs: 60_000 };
        return { ...decision, fallback: undefined };
    }

    async withConcurrency<T>(key: string, limit: number, operation: () => Promise<T>): Promise<T> {
        const current = this.active.get(key) || 0;
        if (limit > 0 && current >= limit) throw new Error("BUDGET_CONCURRENCY_LIMIT");
        this.active.set(key, current + 1);
        try { return await operation(); } finally { const next = (this.active.get(key) || 1) - 1; next > 0 ? this.active.set(key, next) : this.active.delete(key); }
    }
}
