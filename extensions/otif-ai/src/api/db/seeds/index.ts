import { BaseSeeder } from "@buildingai/db";

import { OtifAiDataSeeder } from "./seeders/otif-ai-data.seeder";
import { OtifCheckRulesCatalogSeeder } from "./seeders/otif-check-rules-catalog.seeder";
import { OtifPlatformAgentSeeder } from "./seeders/otif-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new OtifPlatformAgentSeeder(),
        new OtifCheckRulesCatalogSeeder(),
        new OtifAiDataSeeder(),
    ];
}
