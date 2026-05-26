import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";

import { resolveTimestampForStatus } from "../../../shared/anomaly-status";
import { CheckResult } from "../../entities/check-result.entity";

/** Optional demo anomalies; rules come from EhcsCheckRulesCatalogSeeder. */
export class EhcsAiDataSeeder extends BaseSeeder {
    readonly name = "EhcsAiDataSeeder";
    readonly priority = 100;

    async shouldRun(dataSource: DataSource): Promise<boolean> {
        return (await dataSource.getRepository(CheckResult).count()) === 0;
    }

    async run(dataSource: DataSource): Promise<void> {
        const resultsRepo = dataSource.getRepository(CheckResult);

        await resultsRepo.save([
            resultsRepo.create({
                anomalyId: "ANOM-20260524-001",
                ruleId: "RULE_002",
                description: "凭证 ACC-202605001 超过2天仍未审核",
                riskLevel: "中",
                rootCause: "用户未提交审核",
                solution: "尽快审核或退回制单人",
                status: "待解决",
                autoFixed: false,
                checkTime: new Date("2026-05-24T10:30:00"),
            }),
            resultsRepo.create({
                anomalyId: "ANOM-20260524-002",
                ruleId: "RULE_007",
                description: "供应商 A 发票号 INV-001 重复入账",
                riskLevel: "低",
                rootCause: "手工录入重复",
                solution: "冲销重复凭证并加强校验",
                status: "ai自动修复",
                autoFixed: true,
                checkTime: new Date("2026-05-24T09:45:00"),
                resolvedAt: resolveTimestampForStatus(
                    "ai自动修复",
                    undefined,
                    null,
                ),
            }),
        ]);

        this.logSuccess("Demo anomalies seeded (rules from catalog seeder)");
    }
}
