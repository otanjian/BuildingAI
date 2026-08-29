import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index } from "../typeorm";
import { BaseEntity } from "./base";

@AppEntity({ name: "channel_account", comment: "Automation channel account" })
@Index("idx_channel_account_provider_enabled", ["provider", "enabled"])
@Index("uq_channel_account_provider_key", ["provider", "accountKey"], { unique: true })
@Check("ck_channel_account_provider", `LENGTH(TRIM("provider")) BETWEEN 1 AND 64`)
@Check("ck_channel_account_key", `LENGTH(TRIM("account_key")) BETWEEN 1 AND 255`)
export class ChannelAccount extends BaseEntity {
    @Column({ type: "varchar", length: 64 })
    provider: string;

    @Column({ type: "varchar", length: 255, name: "account_key" })
    accountKey: string;

    @Column({ type: "varchar", length: 255, nullable: true, name: "tenant_ref" })
    tenantRef: string | null;

    @Column({ type: "varchar", length: 255, nullable: true, name: "secret_ref" })
    secretRef: string | null;

    @Column({ type: "jsonb", nullable: true, default: "{}" })
    metadata: Record<string, unknown>;

    @Column({ type: "boolean", default: true })
    enabled: boolean;
}
