import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

export const TENANT_ROLE_CODES = ["owner", "admin", "editor", "member", "viewer"] as const;
export type TenantRoleCode = (typeof TENANT_ROLE_CODES)[number];

@AppEntity({ name: "tenant_roles", comment: "Tenant RBAC roles" })
@Index("uq_tenant_role_code", ["tenantId", "code"], { unique: true })
export class TenantRole extends BaseEntity {
    @Column({ type: "uuid", name: "tenant_id" })
    tenantId: string;

    @Column({ type: "varchar", length: 40 })
    code: TenantRoleCode;

    @Column({ type: "varchar", length: 120 })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string | null;

    @Column({ type: "jsonb", default: "{}" })
    permissions: Record<string, unknown>;

    @Column({ type: "boolean", default: false, name: "is_system" })
    isSystem: boolean;

    @Column({ type: "boolean", default: true })
    enabled: boolean;
}
