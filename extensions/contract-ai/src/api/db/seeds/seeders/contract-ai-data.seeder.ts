import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";

import { resolveTimestampForStatus } from "../../../shared/anomaly-status";
import { CheckResult } from "../../entities/check-result.entity";

export class ContractAiDataSeeder extends BaseSeeder {
    readonly name = "ContractAiDataSeeder";
    readonly priority = 100;

    async shouldRun(dataSource: DataSource): Promise<boolean> {
        return (await dataSource.getRepository(CheckResult).count()) === 0;
    }

    async run(dataSource: DataSource): Promise<void> {
        const resultsRepo = dataSource.getRepository(CheckResult);

        await resultsRepo.save([
            resultsRepo.create({
                anomalyId: "CTR-20260525-001",
                ruleId: "CTR_001",
                description: "合同履约自治示例异常：规则触发",
                riskLevel: "中",
                rootCause: "业务数据不满足规则约束",
                solution: "按建议方案整改",
                status: "待解决",
                autoFixed: false,
                checkTime: new Date("2026-05-25T10:30:00"),
            }),
            resultsRepo.create({
                anomalyId: "CTR-20260525-002",
                ruleId: "CTR_008",
                description: "合同履约自治示例异常：低危可自动修复",
                riskLevel: "低",
                rootCause: "历史数据格式不一致",
                solution: "Agent 自动修复演示",
                status: "ai自动修复",
                autoFixed: true,
                checkTime: new Date("2026-05-25T09:45:00"),
                resolvedAt: resolveTimestampForStatus("ai自动修复", undefined, null),
            }),
        ]);

        this.logSuccess("Demo anomalies seeded (rules from catalog seeder)");
    }
}
