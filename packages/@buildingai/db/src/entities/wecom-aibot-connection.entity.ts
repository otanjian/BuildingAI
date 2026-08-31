import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne, type Relation } from "../typeorm";
import { Agent } from "./ai-agent.entity";
import { BaseEntity } from "./base";

@AppEntity({ name: "wecom_aibot_connection", comment: "WeCom intelligent robot connection" })
@Index("uq_wecom_aibot_connection_bot_id", ["normalizedBotId"], { unique: true })
@Index("uq_wecom_aibot_connection_agent_name", ["agentId", "normalizedName"], {
    unique: true,
})
@Index("idx_wecom_aibot_connection_agent_enabled", ["agentId", "enabled"])
export class WecomAibotConnection extends BaseEntity {
    @Column({ type: "text" })
    name: string;

    @Column({ type: "text", name: "normalized_name" })
    normalizedName: string;

    @Column({ type: "uuid", name: "agent_id" })
    agentId: string;

    @ManyToOne(() => Agent, { onDelete: "RESTRICT", nullable: false })
    @JoinColumn({ name: "agent_id" })
    agent: Relation<Agent>;

    @Column({ type: "text", name: "bot_id" })
    botId: string;

    @Column({ type: "text", name: "normalized_bot_id" })
    normalizedBotId: string;

    @Column({ type: "text", name: "bot_secret_encrypted", nullable: true })
    botSecretEncrypted: string | null;

    @Column({ type: "text", name: "agent_access_token_encrypted", nullable: true })
    agentAccessTokenEncrypted: string | null;

    @Column({ type: "uuid", nullable: true, name: "credential_ref" })
    credentialRef: string | null;

    @Column({ type: "boolean", default: false })
    enabled: boolean;
}
