import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "tenant_audit_events", comment: "Tenant authorization audit events" })
@Index("idx_tenant_audit_tenant_created", ["tenantId", "createdAt"])
@Index("idx_tenant_audit_actor_created", ["actorId", "createdAt"])
export class TenantAuditEvent extends BaseEntity {
    @Column({ type: "uuid", nullable: true, name: "tenant_id" })
    tenantId: string | null;

    @Column({ type: "uuid", nullable: true, name: "actor_id" })
    actorId: string | null;

    @Column({ type: "varchar", length: 80 })
    action: string;

    @Column({ type: "varchar", length: 32 })
    outcome: "allowed" | "denied" | "changed";

    @Column({ type: "varchar", length: 80, nullable: true, name: "resource_type" })
    resourceType: string | null;

    @Column({ type: "uuid", nullable: true, name: "resource_id" })
    resourceId: string | null;

    @Column({ type: "jsonb", default: "{}" })
    metadata: Record<string, unknown>;
}
