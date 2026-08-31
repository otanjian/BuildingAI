import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, OneToMany, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Organization } from "./organization.entity";
import { Project } from "./project.entity";
import { ResourceGrant } from "./resource-grant.entity";
import { TenantMembership } from "./tenant-membership.entity";
import { User } from "./user.entity";

export const TENANT_STATUSES = ["active", "suspended", "pending", "archived"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

@AppEntity({ name: "tenants", comment: "Enterprise tenants" })
@Index("uq_tenant_code", ["code"], { unique: true })
@Index("idx_tenant_admin_user", ["adminUserId"])
export class Tenant extends BaseEntity {
    @Column({ type: "varchar", length: 120 })
    name: string;

    @Column({ type: "varchar", length: 80 })
    code: string;

    @Column({ type: "varchar", length: 32, default: "active" })
    status: TenantStatus;

    @Column({ type: "uuid", name: "owner_id" })
    ownerId: string;

    @ManyToOne(() => User, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "owner_id" })
    owner: Relation<User>;

    /**
     * The single user currently responsible for administering this tenant.
     *
     * `ownerId` is retained for compatibility with the original enterprise
     * authorization schema. New tenant administration code should use this
     * field as the source of truth and require the user to be an active
     * tenant membership.
     */
    @Column({ type: "uuid", nullable: true, name: "admin_user_id" })
    adminUserId: string | null;

    @ManyToOne(() => User, { onDelete: "RESTRICT", nullable: true })
    @JoinColumn({ name: "admin_user_id" })
    adminUser: Relation<User>;

    @Column({
        type: "varchar",
        length: 32,
        nullable: true,
        default: "default",
        name: "default_region",
    })
    defaultRegion: string | null;

    @Column({ type: "varchar", length: 32, nullable: true, name: "plan_code" })
    planCode: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "suspended_at" })
    suspendedAt: Date | null;

    @Column({ type: "uuid", nullable: true, name: "suspended_by" })
    suspendedBy: string | null;

    @Column({ type: "text", nullable: true, name: "suspension_reason" })
    suspensionReason: string | null;

    @Column({ type: "integer", default: 1, name: "policy_version" })
    policyVersion: number;

    @OneToMany(() => Organization, (organization) => organization.tenant)
    organizations: Relation<Organization[]>;

    @OneToMany(() => Project, (project) => project.tenant)
    projects: Relation<Project[]>;

    @OneToMany(() => TenantMembership, (membership) => membership.tenant)
    memberships: Relation<TenantMembership[]>;

    @OneToMany(() => ResourceGrant, (grant) => grant.tenant)
    resourceGrants: Relation<ResourceGrant[]>;
}
