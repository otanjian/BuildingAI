import { BaseSeeder } from "@buildingai/db";

import { TaxComplianceAiDataSeeder } from "./seeders/tax-compliance-ai-data.seeder";
import { TaxComplianceCheckRulesCatalogSeeder } from "./seeders/tax-compliance-check-rules-catalog.seeder";
import { TaxCompliancePlatformAgentSeeder } from "./seeders/tax-compliance-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new TaxCompliancePlatformAgentSeeder(),
        new TaxComplianceCheckRulesCatalogSeeder(),
        new TaxComplianceAiDataSeeder(),
    ];
}
