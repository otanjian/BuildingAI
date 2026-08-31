import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const COST_LEDGER_STATES = ["reserved", "settled", "reversed", "adjusted"] as const;
export type CostLedgerState = (typeof COST_LEDGER_STATES)[number];

@AppEntity({ name: "cost_ledger", comment: "Idempotent reserve/settle/reverse cost ledger" })
@Index("idx_cost_ledger_scope_created", ["tenantId", "projectId", "createdAt"])
@Index("uq_cost_ledger_idempotency", ["tenantId", "idempotencyKey"], { unique: true })
export class CostLedger extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", nullable: true, name: "department_id" }) departmentId: string | null;
    @Column({ type: "uuid", nullable: true, name: "project_id" }) projectId: string | null;
    @Column({ type: "uuid", nullable: true, name: "agent_id" }) agentId: string | null;
    @Column({ type: "uuid", nullable: true, name: "actor_id" }) actorId: string | null;
    @Column({ type: "varchar", length: 24, default: "reserved" }) state: CostLedgerState;
    @Column({ type: "numeric", precision: 20, scale: 8, name: "reserved_amount", default: 0 }) reservedAmount: string;
    @Column({ type: "numeric", precision: 20, scale: 8, name: "settled_amount", default: 0 }) settledAmount: string;
    @Column({ type: "varchar", length: 64, nullable: true, name: "price_version" }) priceVersion: string | null;
    @Column({ type: "varchar", length: 160, name: "idempotency_key" }) idempotencyKey: string;
    @Column({ type: "varchar", length: 120, name: "request_id" }) requestId: string;
    @Column({ type: "varchar", length: 120, name: "correlation_id" }) correlationId: string;
    @Column({ type: "jsonb", default: "{}" }) metadata: Record<string, unknown>;
}
