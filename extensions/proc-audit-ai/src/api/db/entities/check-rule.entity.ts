import { ExtensionEntity } from "@buildingai/core/decorators";
import {
    Column,
    CreateDateColumn,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "@buildingai/db/typeorm";

import { PROC_TABLE } from "../proc-audit-table-names";

@ExtensionEntity(PROC_TABLE.CHECK_RULES)
export class CheckRule {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "rule_id", length: 20, unique: true })
    ruleId: string;

    @Column({ name: "business_domain", length: 20 })
    businessDomain: string;

    @Column({ name: "data_item", length: 100 })
    dataItem: string;

    @Column({ name: "rule_description", type: "text" })
    ruleDescription: string;

    @Column({ name: "deduct_score", type: "int" })
    deductScore: number;

    @Column({ length: 10 })
    severity: string;

    @Column({ name: "auto_fix", type: "boolean", default: false })
    autoFix: boolean;

    @Column({ type: "boolean", default: true })
    enabled: boolean;

    @CreateDateColumn({ name: "create_time" })
    createTime: Date;

    @UpdateDateColumn({ name: "update_time" })
    updateTime: Date;
}
