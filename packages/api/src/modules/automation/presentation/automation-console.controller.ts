import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators";
import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Get, Param, Patch, Query } from "@nestjs/common";

import { AutomationService } from "../application/automation.service";
import { AutomationScheduler } from "../infrastructure/automation.scheduler";

@ConsoleController("automations", "定时任务")
export class AutomationConsoleController {
    constructor(
        private readonly service: AutomationService,
        private readonly scheduler: AutomationScheduler,
    ) {}

    @Get("status")
    @Permissions({ code: "list", name: "查看定时任务状态" })
    async status(@Playground() _user: UserPlayground) {
        return {
            ...(await this.service.stats()),
            schedulerActive: this.scheduler.getHealth().active,
            lastReconciledAt: this.scheduler.getHealth().lastReconciledAt,
        };
    }

    @Get("tasks")
    @Permissions({ code: "list", name: "查看定时任务" })
    tasks(@Playground() _user: UserPlayground) { return this.service.listForConsole(); }

    @Get("runs")
    @Permissions({ code: "list", name: "查看定时任务运行记录" })
    runs(@Query("jobId") jobId?: string) { return this.service.listRuns(jobId); }

    @Get("dispatches")
    @Permissions({ code: "list", name: "查看定时任务投递记录" })
    dispatches(@Query("status") status?: any) { return this.service.listDispatches(status); }

    @Patch("dispatches/:id/:action")
    @Permissions({ code: "recover", name: "恢复定时任务投递" })
    recover(@Param("id") id: string, @Param("action") action: "retry" | "dismiss", @Playground() _user: UserPlayground) {
        return this.service.recoverDispatch(id, action);
    }
}
