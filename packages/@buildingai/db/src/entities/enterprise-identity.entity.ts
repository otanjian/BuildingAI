import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const IDENTITY_PROVIDER_TYPES = ["oidc", "saml"] as const;
export type IdentityProviderType = (typeof IDENTITY_PROVIDER_TYPES)[number];

@AppEntity({ name: "enterprise_identity_providers", comment: "Tenant identity federation providers" })
@Index("uq_enterprise_idp_tenant_name", ["tenantId", "name"], { unique: true })
export class EnterpriseIdentityProvider extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 120 }) name: string;
    @Column({ type: "varchar", length: 16 }) type: IdentityProviderType;
    @Column({ type: "varchar", length: 500 }) issuer: string;
    @Column({ type: "varchar", length: 255 }) audience: string;
    @Column({ type: "varchar", length: 500, nullable: true, name: "metadata_url" }) metadataUrl: string | null;
    @Column({ type: "text", nullable: true, name: "certificate_fingerprint" }) certificateFingerprint: string | null;
    @Column({ type: "jsonb", default: "{}" }) settings: Record<string, unknown>;
    @Column({ type: "boolean", default: false }) enabled: boolean;
    @Column({ type: "integer", default: 1, name: "config_version" }) configVersion: number;
}

@AppEntity({ name: "enterprise_identity_domains", comment: "Tenant domain bindings" })
@Index("uq_enterprise_identity_domain", ["domain"], { unique: true })
export class EnterpriseIdentityDomain extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", name: "provider_id" }) providerId: string;
    @Column({ type: "varchar", length: 255 }) domain: string;
    @Column({ type: "boolean", default: false, name: "verified" }) verified: boolean;
}

@AppEntity({ name: "enterprise_directory_mappings", comment: "SCIM group and department mappings" })
@Index("uq_enterprise_directory_mapping", ["tenantId", "externalId", "mappingType"], { unique: true })
export class EnterpriseDirectoryMapping extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 24, name: "mapping_type" }) mappingType: "group" | "department";
    @Column({ type: "varchar", length: 255, name: "external_id" }) externalId: string;
    @Column({ type: "varchar", length: 120, name: "external_name" }) externalName: string;
    @Column({ type: "varchar", length: 80, nullable: true, name: "role_code" }) roleCode: string | null;
    @Column({ type: "uuid", nullable: true, name: "project_id" }) projectId: string | null;
    @Column({ type: "boolean", default: true }) enabled: boolean;
}

@AppEntity({ name: "enterprise_scim_cursors", comment: "SCIM synchronization cursors" })
@Index("uq_enterprise_scim_cursor", ["tenantId", "providerId"], { unique: true })
export class EnterpriseScimCursor extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", name: "provider_id" }) providerId: string;
    @Column({ type: "varchar", length: 255, nullable: true, name: "cursor_value" }) cursorValue: string | null;
    @Column({ type: "timestamptz", nullable: true, name: "last_synced_at" }) lastSyncedAt: Date | null;
    @Column({ type: "varchar", length: 24, default: "idle" }) status: "idle" | "running" | "failed";
}

@AppEntity({ name: "enterprise_sync_events", comment: "Idempotent SCIM synchronization events" })
@Index("uq_enterprise_sync_event", ["tenantId", "providerId", "externalEventId"], { unique: true })
@Index("idx_enterprise_sync_event_status", ["tenantId", "status", "createdAt"])
export class EnterpriseSyncEvent extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", name: "provider_id" }) providerId: string;
    @Column({ type: "varchar", length: 255, name: "external_event_id" }) externalEventId: string;
    @Column({ type: "varchar", length: 32 }) resourceType: string;
    @Column({ type: "varchar", length: 32 }) action: string;
    @Column({ type: "varchar", length: 24, default: "pending" }) status: "pending" | "applied" | "failed" | "dry_run";
    @Column({ type: "jsonb", default: "{}" }) payload: Record<string, unknown>;
    @Column({ type: "text", nullable: true }) error: string | null;
}
