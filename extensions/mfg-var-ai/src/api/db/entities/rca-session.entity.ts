import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, PrimaryGeneratedColumn } from "@buildingai/db/typeorm";

import { MFGV_TABLE } from "../mfg-var-table-names";

@ExtensionEntity(MFGV_TABLE.RCA_SESSIONS)
export class RcaSession {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "anomaly_id", length: 50 })
    anomalyId: string;

    @Column({ name: "conversation_id", type: "varchar", length: 64, nullable: true })
    conversationId: string | null;

    @CreateDateColumn({ name: "create_time" })
    createTime: Date;
}
