import { AppEntity } from "../decorators/app-entity.decorator";
import { Column, Index, JoinColumn, ManyToOne } from "../typeorm";
import { BaseEntity } from "./base";
import { User } from "./user.entity";

/**
 * User-bound Console MCP API key (hashed at rest).
 */
@AppEntity({ name: "console_mcp_api_keys", comment: "Console MCP API keys" })
export class ConsoleMcpApiKey extends BaseEntity {
    @Column({ type: "uuid" })
    @Index()
    userId: string;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: "user_id" })
    user: User;

    @Column({ type: "varchar", length: 100 })
    label: string;

    @Column({ type: "varchar", length: 64 })
    @Index({ unique: true })
    keyHash: string;

    @Column({ type: "varchar", length: 32 })
    keyPrefix: string;

    @Column({ type: "timestamptz", nullable: true })
    revokedAt: Date | null;

    @Column({ type: "timestamptz", nullable: true })
    lastUsedAt: Date | null;
}
