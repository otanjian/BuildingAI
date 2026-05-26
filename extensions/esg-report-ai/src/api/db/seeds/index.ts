import { BaseSeeder } from "@buildingai/db";

import { EsgReportAiDataSeeder } from "./seeders/esg-report-ai-data.seeder";
import { EsgReportCheckRulesCatalogSeeder } from "./seeders/esg-report-check-rules-catalog.seeder";
import { EsgReportPlatformAgentSeeder } from "./seeders/esg-report-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new EsgReportPlatformAgentSeeder(),
        new EsgReportCheckRulesCatalogSeeder(),
        new EsgReportAiDataSeeder(),
    ];
}
