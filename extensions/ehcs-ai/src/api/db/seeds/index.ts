import { BaseSeeder } from "@buildingai/db";

import { EhcsAiDataSeeder } from "./seeders/ehcs-ai-data.seeder";
import { EhcsCheckRulesCatalogSeeder } from "./seeders/ehcs-check-rules-catalog.seeder";
import { EhcsPlatformAgentSeeder } from "./seeders/ehcs-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new EhcsPlatformAgentSeeder(),
        new EhcsCheckRulesCatalogSeeder(),
        new EhcsAiDataSeeder(),
    ];
}
