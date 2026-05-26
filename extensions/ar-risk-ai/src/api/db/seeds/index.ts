import { BaseSeeder } from "@buildingai/db";

import { ArRiskAiDataSeeder } from "./seeders/ar-risk-ai-data.seeder";
import { ArRiskCheckRulesCatalogSeeder } from "./seeders/ar-risk-check-rules-catalog.seeder";
import { ArRiskPlatformAgentSeeder } from "./seeders/ar-risk-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ArRiskPlatformAgentSeeder(),
        new ArRiskCheckRulesCatalogSeeder(),
        new ArRiskAiDataSeeder(),
    ];
}
