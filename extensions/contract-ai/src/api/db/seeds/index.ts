import { BaseSeeder } from "@buildingai/db";

import { ContractAiDataSeeder } from "./seeders/contract-ai-data.seeder";
import { ContractCheckRulesCatalogSeeder } from "./seeders/contract-check-rules-catalog.seeder";
import { ContractPlatformAgentSeeder } from "./seeders/contract-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ContractPlatformAgentSeeder(),
        new ContractCheckRulesCatalogSeeder(),
        new ContractAiDataSeeder(),
    ];
}
