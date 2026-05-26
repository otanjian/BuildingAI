#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { loadRegistry, pascalFromAppId, ROOT } from "./registry.mjs";

function emitDemoSeeder(app) {
    const pascal = pascalFromAppId(app.appId);
    const prefix = app.tablePrefix.replace(/-$/, "");
    return `import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";

import { resolveTimestampForStatus } from "../../../shared/anomaly-status";
import { CheckResult } from "../../entities/check-result.entity";

export class ${pascal}AiDataSeeder extends BaseSeeder {
    readonly name = "${pascal}AiDataSeeder";
    readonly priority = 100;

    async shouldRun(dataSource: DataSource): Promise<boolean> {
        return (await dataSource.getRepository(CheckResult).count()) === 0;
    }

    async run(dataSource: DataSource): Promise<void> {
        const resultsRepo = dataSource.getRepository(CheckResult);

        await resultsRepo.save([
            resultsRepo.create({
                anomalyId: "${app.rulePrefix}-20260525-001",
                ruleId: "${app.rulePrefix}_001",
                description: "${app.productName}示例异常：规则触发",
                riskLevel: "中",
                rootCause: "业务数据不满足规则约束",
                solution: "按建议方案整改",
                status: "待解决",
                autoFixed: false,
                checkTime: new Date("2026-05-25T10:30:00"),
            }),
            resultsRepo.create({
                anomalyId: "${app.rulePrefix}-20260525-002",
                ruleId: "${app.rulePrefix}_008",
                description: "${app.productName}示例异常：低危可自动修复",
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
`;
}

function main() {
    const data = loadRegistry();
    const filter = process.argv[2];
    for (const app of data.apps) {
        if (filter && app.appId !== filter) continue;
        const extDir = path.join(ROOT, "extensions", app.appId);
        if (!fs.existsSync(extDir)) continue;
        const prefix = app.tablePrefix.replace(/-$/, "");
        const outPath = path.join(extDir, "src/api/db/seeds/seeders", `${prefix}-ai-data.seeder.ts`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, emitDemoSeeder(app), "utf8");
        console.log(`Demo seeder: ${outPath}`);
    }
}

main();
