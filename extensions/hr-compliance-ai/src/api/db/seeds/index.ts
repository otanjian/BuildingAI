import { BaseSeeder } from "@buildingai/db";

import { HrComplianceAiDataSeeder } from "./seeders/hr-compliance-ai-data.seeder";
import { HrComplianceCheckRulesCatalogSeeder } from "./seeders/hr-compliance-check-rules-catalog.seeder";
import { HrCompliancePlatformAgentSeeder } from "./seeders/hr-compliance-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new HrCompliancePlatformAgentSeeder(),
        new HrComplianceCheckRulesCatalogSeeder(),
        new HrComplianceAiDataSeeder(),
    ];
}
