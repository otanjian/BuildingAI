import { QueueModule } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AutomationDispatch,
    AutomationJob,
    AutomationRun,
    ChannelAccount,
} from "@buildingai/db/entities";
import { BullModule } from "@nestjs/bullmq";
import { forwardRef, Module, OnModuleInit } from "@nestjs/common";

import { ChannelModule } from "../channel/channel.module";
import { FeishuChannelService } from "../channel/feishu/feishu-channel.service";
import { AutomationAdapterRegistry } from "./application/automation-adapter.registry";
import { FeishuAutomationCommandHandler } from "./application/automation-command.handler";
import { AutomationCommandParser } from "./application/automation-command.parser";
import { AutomationConfirmationService } from "./application/automation-confirmation.service";
import { AutomationIntentParser } from "./application/automation-intent.parser";
import { AutomationService } from "./application/automation.service";
import { PublishedAgentAutomationExecutor } from "./application/automation-executor";
import { AutomationBowiProvider } from "./mcp/automation-bowi.provider";
import { FeishuAutomationAdapter } from "./infrastructure/feishu-automation.adapter";
import { AutomationProcessor } from "./infrastructure/automation.processor";
import { AutomationScheduler } from "./infrastructure/automation.scheduler";
import { AutomationController } from "./presentation/automation.controller";
import { AutomationConsoleController } from "./presentation/automation-console.controller";

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Agent,
            ChannelAccount,
            AutomationJob,
            AutomationRun,
            AutomationDispatch,
        ]),
        QueueModule,
        BullModule.registerQueue({ name: "automation" }),
        forwardRef(() => ChannelModule),
    ],
    controllers: [AutomationController, AutomationConsoleController],
    providers: [
        AutomationCommandParser,
        AutomationConfirmationService,
        AutomationIntentParser,
        PublishedAgentAutomationExecutor,
        { provide: "AUTOMATION_EXECUTOR", useExisting: PublishedAgentAutomationExecutor },
        AutomationService,
        AutomationBowiProvider,
        FeishuAutomationAdapter,
        {
            provide: AutomationAdapterRegistry,
            useFactory: (feishu: FeishuAutomationAdapter) =>
                new AutomationAdapterRegistry([feishu]),
            inject: [FeishuAutomationAdapter],
        },
        FeishuAutomationCommandHandler,
        {
            provide: "FEISHU_AUTOMATION_COMMAND_HANDLER",
            useExisting: FeishuAutomationCommandHandler,
        },
        AutomationProcessor,
        AutomationScheduler,
    ],
    exports: [AutomationService, AutomationAdapterRegistry, AutomationBowiProvider],
})
export class AutomationModule implements OnModuleInit {
    constructor(
        private readonly feishuChannelService: FeishuChannelService,
        private readonly feishuAutomationCommandHandler: FeishuAutomationCommandHandler,
    ) {}

    onModuleInit(): void {
        // Register before FeishuChannelService starts its event clients. This keeps scheduling
        // intents out of the ordinary chat path even when no automation HTTP route is requested.
        this.feishuChannelService.registerAutomationCommandHandler(
            this.feishuAutomationCommandHandler,
        );
    }
}
