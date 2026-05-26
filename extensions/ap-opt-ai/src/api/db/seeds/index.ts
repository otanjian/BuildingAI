import { BaseSeeder } from "@buildingai/db";

import { ApOptAiDataSeeder } from "./seeders/ap-opt-ai-data.seeder";
import { ApOptCheckRulesCatalogSeeder } from "./seeders/ap-opt-check-rules-catalog.seeder";
import { ApOptPlatformAgentSeeder } from "./seeders/ap-opt-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ApOptPlatformAgentSeeder(),
        new ApOptCheckRulesCatalogSeeder(),
        new ApOptAiDataSeeder(),
    ];
}
