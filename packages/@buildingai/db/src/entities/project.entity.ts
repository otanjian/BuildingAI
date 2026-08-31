import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Tenant } from "./tenant.entity";

export const PROJECT_STATUSES = ["active", "archived", "suspended"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

@AppEntity({ name: "tenant_projects", comment: "Tenant projects" })
@Index("uq_tenant_project_code", ["tenantId", "code"], { unique: true })
export class Project extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.projects, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tenant_id" })
    tenant: Relation<Tenant>;

    @Column({ type: "varchar", length: 120 })
    name: string;

    @Column({ type: "varchar", length: 80 })
    code: string;

    @Column({ type: "varchar", length: 32, default: "active" })
    status: ProjectStatus;

    @Column({ type: "uuid", nullable: true, name: "owner_id" })
    ownerId: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
    expiresAt: Date | null;
}
