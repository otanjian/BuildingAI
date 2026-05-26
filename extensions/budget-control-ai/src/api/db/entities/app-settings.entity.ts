import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, PrimaryGeneratedColumn, UpdateDateColumn } from "@buildingai/db/typeorm";

import { BDG_TABLE } from "../budget-control-table-names";

@ExtensionEntity(BDG_TABLE.APP_SETTINGS)
export class AppSettings {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "agent_id", type: "varchar", length: 64, nullable: true })
    agentId: string | null;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;
}
