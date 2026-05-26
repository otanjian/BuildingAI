import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, PrimaryGeneratedColumn, UpdateDateColumn } from "@buildingai/db/typeorm";

import { CHI_TABLE } from "../channel-inv-table-names";

@ExtensionEntity(CHI_TABLE.APP_SETTINGS)
export class AppSettings {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "agent_id", type: "varchar", length: 64, nullable: true })
    agentId: string | null;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;
}
