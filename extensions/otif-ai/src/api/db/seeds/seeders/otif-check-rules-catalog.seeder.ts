import { BaseSeeder } from "@buildingai/db";
import { DataSource } from "@buildingai/db/typeorm";

import { CheckRule } from "../../entities/check-rule.entity";
import {
    OTIF_CHECK_RULES_CATALOG,
    OTIF_CHECK_RULES_CATALOG_VERSION,
} from "../../seed-data/otif-check-rules-catalog";

const CATALOG_MARKER_RULE_ID = "OTIF_032";

export class OtifCheckRulesCatalogSeeder extends BaseSeeder {
    readonly name = "OtifCheckRulesCatalogSeeder";
    readonly priority = 50;

    async shouldRun(dataSource: DataSource): Promise<boolean> {
        const repo = dataSource.getRepository(CheckRule);
        const marker = await repo.findOne({ where: { ruleId: CATALOG_MARKER_OTIF_ID } });
        if (!marker) {
            return true;
        }
        const first = await repo.findOne({ where: { ruleId: "OTIF_001" } });
        if (first && first.dataItem !== OTIF_CHECK_RULES_CATALOG[0]?.dataItem) {
            return true;
        }
        const count = await repo.count();
        return count < OTIF_CHECK_RULES_CATALOG.length;
    }

    async run(dataSource: DataSource): Promise<void> {
        const repo = dataSource.getRepository(CheckRule);
        let inserted = 0;
        let updated = 0;

        for (const entry of OTIF_CHECK_RULES_CATALOG) {
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
            `Catalog v${OTIF_CHECK_RULES_CATALOG_VERSION}: ${inserted} inserted, ${updated} updated (${OTIF_CHECK_RULES_CATALOG.length} rules, all disabled)`,
        );
    }
}
