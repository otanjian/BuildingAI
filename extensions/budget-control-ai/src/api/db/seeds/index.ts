import { BaseSeeder } from "@buildingai/db";

import { BudgetControlAiDataSeeder } from "./seeders/budget-control-ai-data.seeder";
import { BudgetControlCheckRulesCatalogSeeder } from "./seeders/budget-control-check-rules-catalog.seeder";
import { BudgetControlPlatformAgentSeeder } from "./seeders/budget-control-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new BudgetControlPlatformAgentSeeder(),
        new BudgetControlCheckRulesCatalogSeeder(),
        new BudgetControlAiDataSeeder(),
    ];
}
