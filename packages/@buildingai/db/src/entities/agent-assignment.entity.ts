import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { Agent } from "./ai-agent.entity";
import { User } from "./user.entity";

/**
 * 智能体分配实体
 *
 * 记录智能体与用户的分配关系，用于控制智能体广场可见性
 * 当智能体的 squareVisibility 为 "assigned" 时，只有被分配的用户才能在广场看到该智能体
 */
@AppEntity({ name: "ai_agent_assignments", comment: "智能体分配管理" })
@Index(["agentId", "userId"], { unique: true })
export class AgentAssignment extends BaseEntity {
    /**
     * 智能体ID
     */
    @Column({ type: "uuid", comment: "智能体ID" })
    agentId: string;

    /**
     * 用户ID
     */
    @Column({ type: "uuid", comment: "用户ID" })
    userId: string;

    /**
     * 分配者ID
     */
    @Column({ type: "uuid", comment: "分配者ID" })
    assignedBy: string;

    /**
     * 关联的智能体
     */
    @ManyToOne(() => Agent, { onDelete: "CASCADE", createForeignKeyConstraints: false })
    @JoinColumn({ name: "agent_id" })
    agent: Agent;

    /**
     * 关联的用户
     */
    @ManyToOne(() => User, { onDelete: "CASCADE", createForeignKeyConstraints: false })
    @JoinColumn({ name: "user_id" })
    user: User;
}
