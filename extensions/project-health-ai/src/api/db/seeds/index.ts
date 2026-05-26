import { BaseSeeder } from "@buildingai/db";

import { ProjectHealthAiDataSeeder } from "./seeders/project-health-ai-data.seeder";
import { ProjectHealthCheckRulesCatalogSeeder } from "./seeders/project-health-check-rules-catalog.seeder";
import { ProjectHealthPlatformAgentSeeder } from "./seeders/project-health-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ProjectHealthPlatformAgentSeeder(),
        new ProjectHealthCheckRulesCatalogSeeder(),
        new ProjectHealthAiDataSeeder(),
    ];
}
