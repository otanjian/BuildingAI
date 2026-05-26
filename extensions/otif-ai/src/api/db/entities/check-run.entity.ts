import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

import { OTIF_TABLE } from "../otif-table-names";

@ExtensionEntity(OTIF_TABLE.CHECK_RUNS)
export class CheckRun {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ length: 20, default: "running" })
    status: string;

    @CreateDateColumn({ name: "create_time" })
    createTime: Date;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;

    @Column({ name: "finished_at", type: "timestamp", nullable: true })
    finishedAt: Date | null;
}
