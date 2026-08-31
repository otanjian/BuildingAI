import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Organization } from "./organization.entity";
import { Project } from "./project.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";
import type { TenantRoleCode } from "./tenant-role.entity";

export const MEMBERSHIP_STATUSES = ["invited", "active", "suspended", "expired", "revoked"] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

@AppEntity({ name: "tenant_memberships", comment: "Tenant memberships" })
@Index("uq_tenant_membership_user", ["tenantId", "userId"], { unique: true })
@Index("idx_tenant_membership_lookup", ["tenantId", "status", "expiresAt"])
@Index("idx_tenant_membership_user_status", ["userId", "status", "expiresAt"])
@Index("idx_tenant_membership_invitation", ["tenantId", "invitationEmail"])
export class TenantMembership extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @ManyToOne(() => Tenant, (tenant) => tenant.memberships, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tenant_id" })
    tenant: Relation<Tenant>;

    @Column({ type: "uuid", nullable: true, name: "user_id" })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "user_id" })
    user: Relation<User>;

    @Column({ type: "uuid", nullable: true, name: "organization_id" })
    organizationId: string | null;

    @ManyToOne(() => Organization, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "organization_id" })
    organization: Relation<Organization>;

    @Column({ type: "uuid", nullable: true, name: "project_id" })
    projectId: string | null;

    @ManyToOne(() => Project, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "project_id" })
    project: Relation<Project>;

    /**
     * Kept as a compatibility column while the application converges on the
     * simplified admin/member model. Tenant.adminUserId is authoritative for
     * administrator checks; existing owner/editor/viewer values remain valid
     * during the data migration and can be treated as member by new code.
     */
    @Column({ type: "varchar", length: 40, name: "role_code", default: "member" })
    roleCode: TenantRoleCode;

    @Column({ type: "varchar", length: 24, default: "active" })
    status: MembershipStatus;

    @Column({ type: "varchar", length: 255, nullable: true, name: "invitation_email" })
    invitationEmail: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "invited_at" })
    invitedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "accepted_at" })
    acceptedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
    expiresAt: Date | null;

    @Column({ type: "uuid", nullable: true, name: "created_by" })
    createdBy: string | null;

    @Column({ type: "uuid", nullable: true, name: "updated_by" })
    updatedBy: string | null;

    @Column({ type: "jsonb", default: "{}", name: "attributes" })
    attributes: Record<string, unknown>;
}
