import { BaseSeeder } from "@buildingai/db";

import { FxRiskAiDataSeeder } from "./seeders/fx-risk-ai-data.seeder";
import { FxRiskCheckRulesCatalogSeeder } from "./seeders/fx-risk-check-rules-catalog.seeder";
import { FxRiskPlatformAgentSeeder } from "./seeders/fx-risk-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new FxRiskPlatformAgentSeeder(),
        new FxRiskCheckRulesCatalogSeeder(),
        new FxRiskAiDataSeeder(),
    ];
}
