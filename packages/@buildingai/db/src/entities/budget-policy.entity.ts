import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const BUDGET_SCOPES = ["tenant", "department", "project", "agent", "user"] as const;
export type BudgetScope = (typeof BUDGET_SCOPES)[number];

@AppEntity({ name: "budget_policies", comment: "Hierarchical budget and quota policies" })
@Index("idx_budget_policy_scope", ["tenantId", "scope", "scopeId", "enabled"])
export class BudgetPolicy extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 24 }) scope: BudgetScope;
    @Column({ type: "varchar", length: 160, name: "scope_id" }) scopeId: string;
    @Column({ type: "timestamptz", name: "period_start" }) periodStart: Date;
    @Column({ type: "timestamptz", name: "period_end" }) periodEnd: Date;
    @Column({ type: "numeric", precision: 20, scale: 8, name: "soft_limit", default: 0 }) softLimit: string;
    @Column({ type: "numeric", precision: 20, scale: 8, name: "hard_limit", default: 0 }) hardLimit: string;
    @Column({ type: "integer", nullable: true, name: "rate_per_minute" }) ratePerMinute: number | null;
    @Column({ type: "integer", nullable: true, name: "concurrency_limit" }) concurrencyLimit: number | null;
    @Column({ type: "jsonb", default: "[]" }) modelAllowlist: string[];
    @Column({ type: "jsonb", default: "[]" }) toolAllowlist: string[];
    @Column({ type: "numeric", precision: 5, scale: 2, name: "alert_threshold", default: 0.8 }) alertThreshold: string;
    @Column({ type: "boolean", default: true }) enabled: boolean;
}
