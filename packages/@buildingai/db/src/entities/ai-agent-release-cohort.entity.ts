import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "ai_agent_release_cohorts", comment: "Bounded Agent release cohorts" })
@Index("uq_ai_agent_release_cohort_name", ["tenantId", "agentId", "name"], { unique: true })
export class AiAgentReleaseCohort extends BaseEntity {
    @Column({ type: "uuid", name: "agent_id" }) agentId: string;
    @Column({ type: "uuid", name: "tenant_id", nullable: true }) tenantId: string | null;
    @Column({ type: "uuid", name: "project_id", nullable: true }) projectId: string | null;
    @Column({ type: "varchar", length: 120 }) name: string;
    @Column({ type: "varchar", length: 24, default: "tenant" }) scope: "tenant" | "project" | "channel" | "percentage";
    @Column({ type: "jsonb", name: "selector", default: "{}" }) selector: Record<string, unknown>;
    @Column({ type: "integer", name: "traffic_percent", default: 0 }) trafficPercent: number;
    @Column({ type: "boolean", default: true }) enabled: boolean;
}
