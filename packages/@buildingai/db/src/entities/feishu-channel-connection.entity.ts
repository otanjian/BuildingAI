import { AppEntity } from "../decorators/app-entity.decorator";
import { Check, Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { Agent } from "./ai-agent.entity";
import { BaseEntity } from "./base";

export const FEISHU_CONNECTION_MIGRATION_STATUSES = [
    "active",
    "legacy",
    "conflict",
    "orphaned",
    "deleting",
] as const;
export type FeishuConnectionMigrationStatus =
    (typeof FEISHU_CONNECTION_MIGRATION_STATUSES)[number];

@AppEntity({ name: "feishu_channel_connection", comment: "Feishu channel connection" })
@Index("uq_feishu_connection_app_id", ["normalizedAppId"], {
    unique: true,
    where: '"normalized_app_id" IS NOT NULL',
})
@Index("uq_feishu_connection_agent_name", ["agentId", "normalizedName"], {
    unique: true,
    where: '"agent_id" IS NOT NULL AND "normalized_name" IS NOT NULL',
})
@Index("idx_feishu_connection_agent_enabled", ["agentId", "enabled"])
@Index("idx_feishu_connection_status", ["migrationStatus", "enabled"])
@Check("ck_feishu_connection_migration_status", `"migration_status" IN ('active', 'legacy', 'conflict', 'orphaned', 'deleting')`)
export class FeishuChannelConnection extends BaseEntity {
    @Column({ type: "varchar", length: 200, nullable: true })
    name: string | null;

    @Column({ type: "varchar", length: 200, nullable: true, name: "normalized_name" })
    normalizedName: string | null;

    @Column({ type: "uuid", nullable: true, name: "agent_id" })
    agentId: string | null;

    @ManyToOne(() => Agent, { onDelete: "RESTRICT", nullable: true })
    @JoinColumn({ name: "agent_id" })
    agent: Relation<Agent>;

    @Column({ type: "varchar", length: 255, nullable: true, name: "app_id" })
    appId: string | null;

    @Column({ type: "varchar", length: 255, nullable: true, name: "normalized_app_id" })
    normalizedAppId: string | null;

    @Column({ type: "text", nullable: true, name: "app_secret_encrypted" })
    appSecretEncrypted: string | null;

    @Column({ type: "uuid", nullable: true, name: "credential_ref" })
    credentialRef: string | null;

    @Column({ type: "text", nullable: true, name: "agent_access_token_encrypted" })
    agentAccessTokenEncrypted: string | null;

    @Column({ type: "boolean", default: false })
    enabled: boolean;

    @Column({ type: "boolean", default: true, name: "only_mentioned" })
    onlyMentioned: boolean;

    @Column({
        type: "varchar",
        length: 16,
        default: "active",
        name: "migration_status",
    })
    migrationStatus: FeishuConnectionMigrationStatus;

    @Column({ type: "varchar", length: 255, nullable: true, name: "legacy_source_key" })
    legacySourceKey: string | null;

    @Column({ type: "text", nullable: true, name: "migration_error" })
    migrationError: string | null;
}
