import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const DATA_CLASSIFICATIONS = ["public", "internal", "confidential", "restricted"] as const;
export type DataClassification = (typeof DATA_CLASSIFICATIONS)[number];

@AppEntity({ name: "enterprise_mfa_policies", comment: "Tenant MFA and step-up policies" })
@Index("uq_enterprise_mfa_policy_tenant", ["tenantId"], { unique: true })
export class EnterpriseMfaPolicy extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "boolean", default: false, name: "required" }) required: boolean;
    @Column({ type: "integer", default: 15, name: "step_up_minutes" }) stepUpMinutes: number;
    @Column({ type: "jsonb", default: "[]", name: "sensitive_actions" }) sensitiveActions: string[];
}

@AppEntity({ name: "enterprise_step_up_proofs", comment: "Short lived MFA step-up proofs" })
@Index("idx_enterprise_step_up_user", ["tenantId", "userId", "expiresAt"])
export class EnterpriseStepUpProof extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", name: "user_id" }) userId: string;
    @Column({ type: "varchar", length: 80, name: "action" }) action: string;
    @Column({ type: "varchar", length: 128, name: "proof_hash" }) proofHash: string;
    @Column({ type: "timestamptz", name: "expires_at" }) expiresAt: Date;
}

@AppEntity({ name: "enterprise_data_policies", comment: "Tenant classification, residency and provider policies" })
@Index("uq_enterprise_data_policy_tenant", ["tenantId"], { unique: true })
export class EnterpriseDataPolicy extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 24, default: "internal", name: "default_classification" }) defaultClassification: DataClassification;
    @Column({ type: "jsonb", default: "[]", name: "allowed_regions" }) allowedRegions: string[];
    @Column({ type: "boolean", default: false, name: "allow_cross_region" }) allowCrossRegion: boolean;
    @Column({ type: "boolean", default: false, name: "allow_vendor_training" }) allowVendorTraining: boolean;
    @Column({ type: "jsonb", default: "{}", name: "provider_rules" }) providerRules: Record<string, unknown>;
    @Column({ type: "jsonb", default: "{}", name: "masking_rules" }) maskingRules: Record<string, unknown>;
}

@AppEntity({ name: "enterprise_retention_policies", comment: "Tenant data retention policies" })
@Index("uq_enterprise_retention_policy_scope", ["tenantId", "classification"], { unique: true })
export class EnterpriseRetentionPolicy extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 24 }) classification: DataClassification;
    @Column({ type: "integer", name: "retention_days" }) retentionDays: number;
    @Column({ type: "boolean", default: true, name: "delete_on_expiry" }) deleteOnExpiry: boolean;
}

@AppEntity({ name: "enterprise_legal_holds", comment: "Legal holds protecting records from deletion" })
@Index("idx_enterprise_legal_hold_scope", ["tenantId", "status"])
export class EnterpriseLegalHold extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 120 }) name: string;
    @Column({ type: "varchar", length: 24, default: "active" }) status: "active" | "released";
    @Column({ type: "jsonb", default: "{}", name: "scope" }) scope: Record<string, unknown>;
    @Column({ type: "uuid", nullable: true, name: "created_by" }) createdBy: string | null;
    @Column({ type: "timestamptz", nullable: true, name: "released_at" }) releasedAt: Date | null;
}

@AppEntity({ name: "enterprise_data_subject_requests", comment: "Data subject export and deletion requests" })
@Index("idx_enterprise_dsr_tenant_status", ["tenantId", "status", "createdAt"])
export class EnterpriseDataSubjectRequest extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", nullable: true, name: "subject_user_id" }) subjectUserId: string | null;
    @Column({ type: "varchar", length: 24 }) type: "export" | "delete" | "correct";
    @Column({ type: "varchar", length: 24, default: "pending" }) status: "pending" | "running" | "completed" | "failed" | "blocked";
    @Column({ type: "jsonb", default: "{}" }) scope: Record<string, unknown>;
    @Column({ type: "text", nullable: true }) reason: string | null;
}

@AppEntity({ name: "enterprise_governance_jobs", comment: "Asynchronous export and deletion jobs" })
@Index("idx_enterprise_governance_job_tenant_status", ["tenantId", "status", "createdAt"])
export class EnterpriseGovernanceJob extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "uuid", nullable: true, name: "request_id" }) requestId: string | null;
    @Column({ type: "varchar", length: 24 }) type: "export" | "delete";
    @Column({ type: "varchar", length: 24, default: "queued" }) status: "queued" | "running" | "completed" | "failed" | "blocked";
    @Column({ type: "integer", default: 0 }) progress: number;
    @Column({ type: "integer", default: 0 }) attempts: number;
    @Column({ type: "jsonb", default: "{}" }) scope: Record<string, unknown>;
    @Column({ type: "jsonb", default: "{}" }) summary: Record<string, unknown>;
    @Column({ type: "text", nullable: true, name: "last_error" }) lastError: string | null;
}

@AppEntity({ name: "enterprise_completion_manifests", comment: "Verifiable governance completion manifests" })
@Index("uq_enterprise_completion_manifest_job", ["jobId"], { unique: true })
export class EnterpriseCompletionManifest extends BaseEntity {
    @Column({ type: "uuid", name: "job_id" }) jobId: string;
    @Column({ type: "uuid", name: "tenant_id" }) tenantId: string;
    @Column({ type: "varchar", length: 128, name: "manifest_hash" }) manifestHash: string;
    @Column({ type: "integer", name: "record_count" }) recordCount: number;
    @Column({ type: "jsonb", default: "[]", name: "evidence" }) evidence: Array<Record<string, unknown>>;
    @Column({ type: "timestamptz", name: "completed_at" }) completedAt: Date;
}
