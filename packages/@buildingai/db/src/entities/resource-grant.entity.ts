import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Project } from "./project.entity";
import { Tenant } from "./tenant.entity";
import type { TenantRoleCode } from "./tenant-role.entity";

export const RESOURCE_GRANT_ACTIONS = [
    "read",
    "create",
    "update",
    "delete",
    "publish",
    "execute",
    "approve",
    "export",
] as const;
export type ResourceGrantAction = (typeof RESOURCE_GRANT_ACTIONS)[number];

@AppEntity({ name: "tenant_resource_grants", comment: "Tenant resource grants" })
@Index("idx_resource_grant_subject", ["tenantId", "resourceType", "resourceId"])
@Index("uq_resource_grant_subject", ["tenantId", "resourceType", "resourceId", "subjectType", "subjectId", "projectId"], { unique: true })
export class ResourceGrant extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.resourceGrants, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tenant_id" })
    tenant: Relation<Tenant>;

    @Column({ type: "uuid", nullable: true, name: "project_id" })
    projectId: string | null;

    @ManyToOne(() => Project, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "project_id" })
    project: Relation<Project>;

    @Column({ type: "varchar", length: 80, name: "resource_type" })
    resourceType: string;

    @Column({ type: "uuid", name: "resource_id" })
    resourceId: string;

    @Column({ type: "varchar", length: 16, name: "subject_type" })
    subjectType: "user" | "role" | "organization";

    @Column({ type: "uuid", name: "subject_id" })
    subjectId: string;

    @Column({ type: "varchar", length: 40, nullable: true, name: "role_code" })
    roleCode: TenantRoleCode | null;

    @Column({ type: "jsonb", default: "[]" })
    actions: ResourceGrantAction[];

    @Column({ type: "jsonb", default: "{}" })
    conditions: Record<string, unknown>;

    @Column({ type: "integer", default: 1, name: "policy_version" })
    policyVersion: number;

    @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
    expiresAt: Date | null;

    @Column({ type: "uuid", nullable: true, name: "created_by" })
    createdBy: string | null;

    @Column({ type: "uuid", nullable: true, name: "revoked_by" })
    revokedBy: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "revoked_at" })
    revokedAt: Date | null;
}
