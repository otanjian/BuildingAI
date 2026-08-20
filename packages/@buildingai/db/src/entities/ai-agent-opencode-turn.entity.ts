import { AppEntity } from "../decorators/app-entity.decorator";
import {
    Check,
    Column,
    Index,
    JoinColumn,
    ManyToOne,
    type Relation,
} from "../typeorm";
import { AgentChatMessage } from "./ai-agent-chat-message.entity";
import { AgentChatRecord } from "./ai-agent-chat-record.entity";
import { BaseEntity } from "./base";

export const OPENCODE_TURN_ACTIVE_STATUSES = ["accepted", "running", "committing"] as const;
export const OPENCODE_TURN_TERMINAL_STATUSES = ["completed", "cancelled", "failed"] as const;
export const OPENCODE_TURN_STATUSES = [
    ...OPENCODE_TURN_ACTIVE_STATUSES,
    ...OPENCODE_TURN_TERMINAL_STATUSES,
] as const;

export type OpencodeTurnStatus = (typeof OPENCODE_TURN_STATUSES)[number];

@AppEntity({ name: "ai_agent_opencode_turn", comment: "Durable OpenCode turn" })
@Index("uq_oc_turn_one_active_conversation", ["conversationId"], {
    unique: true,
    where: `"status" IN ('accepted', 'running', 'committing')`,
})
@Index("uq_oc_turn_input_message", ["inputMessageId"], { unique: true })
@Index("uq_oc_turn_assistant_message", ["assistantMessageId"], {
    unique: true,
    where: `"assistant_message_id" IS NOT NULL`,
})
@Index("uq_oc_turn_remote_user_message", ["conversationId", "opencodeUserMessageId"], {
    unique: true,
})
@Index("idx_oc_turn_active_lease", ["leaseExpiresAt", "createdAt"], {
    where: `"status" IN ('accepted', 'running', 'committing')`,
})
@Index("idx_oc_turn_conversation_created", ["conversationId", "createdAt"])
@Check(
    "ck_oc_turn_status",
    `"status" IN ('accepted', 'running', 'committing', 'completed', 'cancelled', 'failed')`,
)
@Check(
    "ck_oc_turn_lifecycle",
    `(
        (
            "status" = 'accepted'
            AND "completed_at" IS NULL
            AND "assistant_message_id" IS NULL
            AND "dispatch_snapshot" IS NOT NULL
        )
        OR
        (
            "status" IN ('running', 'committing')
            AND "completed_at" IS NULL
            AND "assistant_message_id" IS NULL
            AND "dispatch_snapshot" IS NOT NULL
            AND "artifact_baseline" IS NOT NULL
        )
        OR
        (
            "status" IN ('completed', 'cancelled', 'failed')
            AND "completed_at" IS NOT NULL
            AND "assistant_message_id" IS NOT NULL
            AND "dispatch_snapshot" IS NULL
            AND "artifact_baseline" IS NULL
        )
    )`,
)
@Check(
    "ck_oc_turn_lease_pair",
    `("lease_token" IS NULL AND "lease_expires_at" IS NULL)
        OR ("lease_token" IS NOT NULL AND "lease_expires_at" IS NOT NULL)`,
)
export class AgentOpencodeTurn extends BaseEntity {
    @Column({ type: "uuid", nullable: false, comment: "BuildingAI conversation ID" })
    conversationId: string;

    @Column({ type: "text", nullable: false, comment: "Canonical client command hash" })
    requestHash: string;

    @Column({ type: "jsonb", nullable: true, comment: "Credential-free dispatch snapshot" })
    dispatchSnapshot: Record<string, unknown> | null;

    @Column({ type: "jsonb", nullable: true, comment: "Pre-dispatch artifact baseline" })
    artifactBaseline: Record<string, unknown> | null;

    @Column({ type: "text", nullable: false, comment: "Accepted OpenCode runtime hash" })
    runtimeConfigHash: string;

    @Column({ type: "uuid", nullable: false, comment: "Persisted user message ID" })
    inputMessageId: string;

    @Column({ type: "uuid", nullable: true, comment: "Terminal assistant message ID" })
    assistantMessageId: string | null;

    @Column({ type: "text", nullable: false, comment: "Stable OpenCode user message ID" })
    opencodeUserMessageId: string;

    @Column({ type: "text", nullable: false, default: "accepted", comment: "Turn lifecycle state" })
    status: OpencodeTurnStatus;

    @Column({ type: "timestamptz", nullable: false, comment: "Last changed remote evidence time" })
    lastActivityAt: Date;

    @Column({ type: "text", nullable: true, comment: "Terminal machine-readable error code" })
    errorCode: string | null;

    @Column({ type: "text", nullable: true, comment: "Terminal user-visible error detail" })
    errorMessage: string | null;

    @Column({ type: "uuid", nullable: true, comment: "Current worker claim token" })
    leaseToken: string | null;

    @Column({ type: "timestamptz", nullable: true, comment: "Current worker lease expiry" })
    leaseExpiresAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, comment: "Turn cancellation request time" })
    cancelRequestedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, comment: "Remote execution start time" })
    startedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true, comment: "Atomic terminal commit time" })
    completedAt: Date | null;

    @ManyToOne(() => AgentChatRecord, { onDelete: "CASCADE" })
    @JoinColumn({ name: "conversation_id" })
    conversation: Relation<AgentChatRecord>;

    @ManyToOne(() => AgentChatMessage, { onDelete: "RESTRICT" })
    @JoinColumn({ name: "input_message_id" })
    inputMessage: Relation<AgentChatMessage>;

    @ManyToOne(() => AgentChatMessage, { nullable: true, onDelete: "RESTRICT" })
    @JoinColumn({ name: "assistant_message_id" })
    assistantMessage: Relation<AgentChatMessage> | null;
}
