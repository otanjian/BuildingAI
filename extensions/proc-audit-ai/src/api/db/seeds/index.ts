import { BaseSeeder } from "@buildingai/db";

import { ProcAuditAiDataSeeder } from "./seeders/proc-audit-ai-data.seeder";
import { ProcAuditCheckRulesCatalogSeeder } from "./seeders/proc-audit-check-rules-catalog.seeder";
import { ProcAuditPlatformAgentSeeder } from "./seeders/proc-audit-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ProcAuditPlatformAgentSeeder(),
        new ProcAuditCheckRulesCatalogSeeder(),
        new ProcAuditAiDataSeeder(),
    ];
}
