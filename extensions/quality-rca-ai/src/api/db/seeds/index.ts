import { BaseSeeder } from "@buildingai/db";

import { QualityRcaAiDataSeeder } from "./seeders/quality-rca-ai-data.seeder";
import { QualityRcaCheckRulesCatalogSeeder } from "./seeders/quality-rca-check-rules-catalog.seeder";
import { QualityRcaPlatformAgentSeeder } from "./seeders/quality-rca-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new QualityRcaPlatformAgentSeeder(),
        new QualityRcaCheckRulesCatalogSeeder(),
        new QualityRcaAiDataSeeder(),
    ];
}
