import { BaseSeeder } from "@buildingai/db";

import { ChannelInvAiDataSeeder } from "./seeders/channel-inv-ai-data.seeder";
import { ChannelInvCheckRulesCatalogSeeder } from "./seeders/channel-inv-check-rules-catalog.seeder";
import { ChannelInvPlatformAgentSeeder } from "./seeders/channel-inv-platform-agent.seeder";

export async function getSeeders(): Promise<BaseSeeder[]> {
    return [
        new ChannelInvPlatformAgentSeeder(),
        new ChannelInvCheckRulesCatalogSeeder(),
        new ChannelInvAiDataSeeder(),
    ];
}
