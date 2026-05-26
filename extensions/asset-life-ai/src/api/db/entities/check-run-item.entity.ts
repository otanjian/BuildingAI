import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

import { AST_TABLE } from "../asset-life-table-names";

@ExtensionEntity(AST_TABLE.CHECK_RUN_ITEMS)
export class CheckRunItem {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "run_id", type: "int" })
    runId: number;

    @Column({ name: "rule_id", length: 20 })
    ruleId: string;

    @Column({ length: 20, default: "pending" })
    status: string;

    @Column({ name: "conversation_id", type: "varchar", length: 64, nullable: true })
    conversationId: string | null;

    @Column({ name: "error_message", type: "text", nullable: true })
    errorMessage: string | null;

    @CreateDateColumn({ name: "create_time" })
    createTime: Date;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;
}
