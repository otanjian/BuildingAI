import { BaseSeeder } from "@buildingai/db";

import { ServiceSlaAiDataSeeder } from "./seeders/service-sla-ai-data.seeder";
import { ServiceSlaCheckRulesCatalogSeeder } from "./seeders/service-sla-check-rules-catalog.seeder";
import { ServiceSlaPlatformAgentSeeder } from "./seeders/service-sla-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ServiceSlaPlatformAgentSeeder(),
        new ServiceSlaCheckRulesCatalogSeeder(),
        new ServiceSlaAiDataSeeder(),
    ];
}
