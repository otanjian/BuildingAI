import { BaseSeeder } from "@buildingai/db";

import { MfgVarAiDataSeeder } from "./seeders/mfg-var-ai-data.seeder";
import { MfgVarCheckRulesCatalogSeeder } from "./seeders/mfg-var-check-rules-catalog.seeder";
import { MfgVarPlatformAgentSeeder } from "./seeders/mfg-var-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new MfgVarPlatformAgentSeeder(),
        new MfgVarCheckRulesCatalogSeeder(),
        new MfgVarAiDataSeeder(),
    ];
}
