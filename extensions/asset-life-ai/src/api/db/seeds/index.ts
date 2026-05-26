import { BaseSeeder } from "@buildingai/db";

import { AssetLifeAiDataSeeder } from "./seeders/asset-life-ai-data.seeder";
import { AssetLifeCheckRulesCatalogSeeder } from "./seeders/asset-life-check-rules-catalog.seeder";
import { AssetLifePlatformAgentSeeder } from "./seeders/asset-life-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new AssetLifePlatformAgentSeeder(),
        new AssetLifeCheckRulesCatalogSeeder(),
        new AssetLifeAiDataSeeder(),
    ];
}
