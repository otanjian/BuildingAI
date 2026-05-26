import { BaseSeeder } from "@buildingai/db";

import { MdmQualityAiDataSeeder } from "./seeders/mdm-quality-ai-data.seeder";
import { MdmQualityCheckRulesCatalogSeeder } from "./seeders/mdm-quality-check-rules-catalog.seeder";
import { MdmQualityPlatformAgentSeeder } from "./seeders/mdm-quality-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new MdmQualityPlatformAgentSeeder(),
        new MdmQualityCheckRulesCatalogSeeder(),
        new MdmQualityAiDataSeeder(),
    ];
}
