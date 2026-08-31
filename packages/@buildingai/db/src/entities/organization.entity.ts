import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Tenant } from "./tenant.entity";

@AppEntity({ name: "tenant_organizations", comment: "Tenant organizations" })
@Index("uq_tenant_organization_code", ["tenantId", "code"], { unique: true })
@Index("idx_tenant_organization_parent", ["tenantId", "parentId"])
export class Organization extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.organizations, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tenant_id" })
    tenant: Relation<Tenant>;

    @Column({ type: "varchar", length: 120 })
    name: string;

    @Column({ type: "varchar", length: 80 })
    code: string;

    @Column({ type: "uuid", nullable: true, name: "parent_id" })
    parentId: string | null;

    @Column({ type: "integer", default: 1 })
    level: number;

    @Column({ type: "boolean", default: true })
    enabled: boolean;
}
