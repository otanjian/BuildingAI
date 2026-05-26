import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";

import { CheckRule } from "../../entities/check-rule.entity";
import {
    APO_CHECK_RULES_CATALOG,
    APO_CHECK_RULES_CATALOG_VERSION,
} from "../../seed-data/ap-opt-check-rules-catalog";

const CATALOG_MARKER_RULE_ID = "AP_032";

export class ApOptCheckRulesCatalogSeeder extends BaseSeeder {
    readonly name = "ApOptCheckRulesCatalogSeeder";
    readonly priority = 50;

    async shouldRun(dataSource: DataSource): Promise<boolean> {
        const repo = dataSource.getRepository(CheckRule);
        const marker = await repo.findOne({ where: { ruleId: CATALOG_MARKER_AP_ID } });
        if (!marker) {
            return true;
        }
        const first = await repo.findOne({ where: { ruleId: "AP_001" } });
        if (first && first.dataItem !== APO_CHECK_RULES_CATALOG[0]?.dataItem) {
            return true;
        }
        const count = await repo.count();
        return count < APO_CHECK_RULES_CATALOG.length;
    }

    async run(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(CheckRule);
        let inserted = 0;
        let updated = 0;

        for (const entry of APO_CHECK_RULES_CATALOG) {
            const existing = await repo.findOne({ where: { ruleId: entry.ruleId } });
            if (existing) {
                existing.businessDomain = entry.businessDomain;
                existing.dataItem = entry.dataItem;
                existing.ruleDescription = entry.ruleDescription;
                existing.deductScore = entry.deductScore;
                existing.severity = entry.severity;
                existing.autoFix = entry.autoFix ?? false;
                existing.enabled = false;
                await repo.save(existing);
                updated++;
            } else {
                await repo.save(
                    repo.create({
                        ...entry,
                        autoFix: entry.autoFix ?? false,
                        enabled: false,
                    }),
                );
                inserted++;
            }
        }

        this.logSuccess(
            `Catalog v${APO_CHECK_RULES_CATALOG_VERSION}: ${inserted} inserted, ${updated} updated (${APO_CHECK_RULES_CATALOG.length} rules, all disabled)`,
        );
    }
}
