import { Module } from "@nestjs/common";

import { AnomaliesModule } from "./anomalies/anomalies.module";
import { BowiMcpModule } from "./bowi-mcp/bowi-mcp.module";
import { CheckRunsModule } from "./check-runs/check-runs.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { RcaModule } from "./rca/rca.module";
import { RulesModule } from "./rules/rules.module";
import { SettingsModule } from "./settings/settings.module";

@Module({
    imports: [
        SettingsModule,
        RulesModule,
        AnomaliesModule,
        DashboardModule,
        CheckRunsModule,
        RcaModule,
        BowiMcpModule,
    ],
    exports: [
        SettingsModule,
        RulesModule,
        AnomaliesModule,
        DashboardModule,
        CheckRunsModule,
        RcaModule,
        BowiMcpModule,
    ],
})
export class AppModule {}
