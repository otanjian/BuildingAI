import { BaseSeeder } from "@buildingai/db";

import { ForecastAiDataSeeder } from "./seeders/forecast-ai-data.seeder";
import { ForecastCheckRulesCatalogSeeder } from "./seeders/forecast-check-rules-catalog.seeder";
import { ForecastPlatformAgentSeeder } from "./seeders/forecast-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ForecastPlatformAgentSeeder(),
        new ForecastCheckRulesCatalogSeeder(),
        new ForecastAiDataSeeder(),
    ];
}
