import { ExtensionEntity } from "@buildingai/core/decorators";
import { Column, CreateDateColumn, PrimaryGeneratedColumn } from "@buildingai/db/typeorm";

import { HRC_TABLE } from "../hr-compliance-table-names";

@ExtensionEntity(HRC_TABLE.CHECK_RESULTS)
export class CheckResult {
    @PrimaryGeneratedColumn("increment")
    id: number;

    @Column({ name: "anomaly_id", length: 50, unique: true })
    anomalyId: string;

    @Column({ name: "rule_id", length: 20 })
    ruleId: string;

    @Column({ type: "text" })
    description: string;

    @Column({ name: "risk_level", length: 10 })
    riskLevel: string;

    @Column({ name: "root_cause", type: "text", nullable: true })
    rootCause: string | null;

    @Column({ type: "text", nullable: true })
    solution: string | null;

    @Column({ length: 20 })
    status: string;

    @Column({ name: "auto_fixed", type: "boolean", default: false })
    autoFixed: boolean;

    @Column({ name: "check_time", type: "timestamp" })
    checkTime: Date;

    @Column({ name: "resolved_at", type: "timestamp", nullable: true })
    resolvedAt: Date | null;

    @CreateDateColumn({ name: "create_time" })
    createTime: Date;
}
