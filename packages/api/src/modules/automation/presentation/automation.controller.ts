import { type UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators";
import { WebController } from "@common/decorators/controller.decorator";
import { Body, Delete, Get, Headers, Param, Patch, Post } from "@nestjs/common";

import { AutomationBowiProvider } from "../mcp/automation-bowi.provider";

@WebController("automations")
export class AutomationController {
    constructor(private readonly automationBowiProvider: AutomationBowiProvider) {}

    @Get()
    list(@Playground() user: UserPlayground) {
        return this.automationBowiProvider.executeForCreator("automation_search", {}, user.id);
    }

    @Get(":id")
    detail(@Param("id") id: string, @Playground() user: UserPlayground) {
        return this.automationBowiProvider.executeForCreator(
            "automation_get",
            { taskId: id },
            user.id,
        );
    }

    @Patch(":id")
    update(
        @Param("id") id: string,
        @Body() body: Record<string, unknown>,
        @Playground() user: UserPlayground,
    ) {
        return this.automationBowiProvider.executeForCreator(
            "automation_update",
            { ...body, taskId: id },
            user.id,
        );
    }

    @Patch(":id/:operation")
    transition(
        @Param("id") id: string,
        @Param("operation") operation: "pause" | "resume" | "cancel",
        @Body() body: { expectedUpdatedAt?: string } = {},
        @Playground() user: UserPlayground,
    ) {
        return this.automationBowiProvider.executeForCreator(
            operation === "cancel" ? "automation_delete" : `automation_${operation}`,
            {
                taskId: id,
                ...(body.expectedUpdatedAt ? { expectedUpdatedAt: body.expectedUpdatedAt } : {}),
            },
            user.id,
        );
    }

    @Delete(":id")
    remove(
        @Param("id") id: string,
        @Body() body: { expectedUpdatedAt?: string } = {},
        @Playground() user: UserPlayground,
    ) {
        return this.automationBowiProvider.executeForCreator(
            "automation_delete",
            {
                taskId: id,
                ...(body.expectedUpdatedAt ? { expectedUpdatedAt: body.expectedUpdatedAt } : {}),
            },
            user.id,
        );
    }

    @Post(":id/run")
    run(
        @Param("id") id: string,
        @Headers("idempotency-key") key: string,
        @Playground() user: UserPlayground,
    ) {
        return this.automationBowiProvider.executeForCreator(
            "automation_run",
            { taskId: id, idempotencyKey: key || `api:${Date.now()}` },
            user.id,
        );
    }
}
