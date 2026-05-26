import { BaseSeeder } from "@buildingai/db";

import { InvOptAiDataSeeder } from "./seeders/inv-opt-ai-data.seeder";
import { InvOptCheckRulesCatalogSeeder } from "./seeders/inv-opt-check-rules-catalog.seeder";
import { InvOptPlatformAgentSeeder } from "./seeders/inv-opt-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new InvOptPlatformAgentSeeder(),
        new InvOptCheckRulesCatalogSeeder(),
        new InvOptAiDataSeeder(),
    ];
}
