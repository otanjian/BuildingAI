import { BaseSeeder } from "@buildingai/db";

import { EnergyCarbonAiDataSeeder } from "./seeders/energy-carbon-ai-data.seeder";
import { EnergyCarbonCheckRulesCatalogSeeder } from "./seeders/energy-carbon-check-rules-catalog.seeder";
import { EnergyCarbonPlatformAgentSeeder } from "./seeders/energy-carbon-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new EnergyCarbonPlatformAgentSeeder(),
        new EnergyCarbonCheckRulesCatalogSeeder(),
        new EnergyCarbonAiDataSeeder(),
    ];
}
