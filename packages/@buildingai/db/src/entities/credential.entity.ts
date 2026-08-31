import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { BaseEntity } from "./base";
import { Project } from "./project.entity";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

export const CREDENTIAL_STATUSES = ["active", "revoked", "expired"] as const;
export type CredentialStatus = (typeof CREDENTIAL_STATUSES)[number];

export interface CredentialScope {
    resource: string;
    actions: string[];
}

@AppEntity({ name: "tenant_credentials", comment: "Tenant-scoped encrypted credentials" })
@Index("idx_tenant_credentials_scope", ["tenantId", "projectId", "environment", "status"])
@Index("uq_tenant_credentials_name", ["tenantId", "projectId", "name"], { unique: true })
export class Credential extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
    @JoinColumn({ name: "tenant_id" })
    tenant: Relation<Tenant>;

    @Column({ type: "uuid", nullable: true, name: "project_id" })
    projectId: string | null;

    @ManyToOne(() => Project, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: "project_id" })
    project: Relation<Project>;

    @Column({ type: "varchar", length: 120 })
    name: string;

    @Column({ type: "varchar", length: 80 })
    provider: string;

    @Column({ type: "varchar", length: 80 })
    purpose: string;

    @Column({ type: "jsonb", default: "[]" })
    scopes: CredentialScope[];

    @Column({ type: "varchar", length: 32, default: "development" })
    environment: string;

    @Column({ type: "varchar", length: 24, default: "active" })
    status: CredentialStatus;

    @Column({ type: "uuid", nullable: true, name: "current_version_id" })
    currentVersionId: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "expires_at" })
    expiresAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, name: "last_used_at" })
    lastUsedAt: Date | null;

    @Column({ type: "uuid", nullable: true, name: "created_by" })
    createdBy: string | null;

    @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
    @JoinColumn({ name: "created_by" })
    creator: Relation<User>;

    @Column({ type: "uuid", nullable: true, name: "revoked_by" })
    revokedBy: string | null;

    @Column({ type: "timestamptz", nullable: true, name: "revoked_at" })
    revokedAt: Date | null;
}
