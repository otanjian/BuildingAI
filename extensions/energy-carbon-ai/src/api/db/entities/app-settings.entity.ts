import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, PrimaryGeneratedColumn, UpdateDateColumn } from "@buildingai/db/typeorm";

import { ECO_TABLE } from "../energy-carbon-table-names";

@ExtensionEntity(ECO_TABLE.APP_SETTINGS)
export class AppSettings {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "agent_id", type: "varchar", length: 64, nullable: true })
    agentId: string | null;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;
}
