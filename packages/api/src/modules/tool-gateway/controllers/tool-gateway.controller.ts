import type { UserPlayground } from "@buildingai/db";
import { Playground } from "@buildingai/decorators/playground.decorator";
import { ConsoleController, Permissions, TenantRequired } from "@common/decorators";
import { Body, Get, Param, Patch, Post, Query } from "@nestjs/common";

import { ApprovalDecisionDto, ExecuteToolDto, ListToolQueryDto, RegisterToolDto } from "../dto/tool-gateway.dto";
import { ToolGatewayService } from "../services/tool-gateway.service";

@ConsoleController("tool-gateway", "工具网关")
@TenantRequired()
export class ToolGatewayController {
    constructor(private readonly gateway: ToolGatewayService) {}
    @Get() @Permissions({ code: "list", name: "查看工具注册" }) list(@Playground() user: UserPlayground, @Query() query: ListToolQueryDto) { return this.gateway.list(user, query); }
    @Post() @Permissions({ code: "register", name: "注册工具" }) register(@Playground() user: UserPlayground, @Body() dto: RegisterToolDto) { return this.gateway.register(user, dto); }
    @Patch(":id/disable") @Permissions({ code: "disable", name: "禁用工具" }) disable(@Playground() user: UserPlayground, @Param("id") id: string, @Body() body: { disabled?: boolean }) { return this.gateway.toggle(user, id, body.disabled !== false); }
    @Post("emergency") @Permissions({ code: "emergency", name: "紧急禁用工具网关" }) emergency(@Playground() user: UserPlayground, @Body() body: { disabled: boolean }) { return this.gateway.emergency(user, body.disabled !== false); }
    @Get("approvals") @Permissions({ code: "approvals:list", name: "查看工具审批" }) approvals(@Playground() user: UserPlayground) { return this.gateway.listApprovals(user); }
    @Post("approvals") @Permissions({ code: "approvals:create", name: "申请工具审批" }) requestApproval(@Playground() user: UserPlayground, @Body() dto: ExecuteToolDto) { return this.gateway.requestApproval(user, dto); }
    @Post("approvals/:id/decision") @Permissions({ code: "approvals:decide", name: "处理工具审批" }) decide(@Playground() user: UserPlayground, @Param("id") id: string, @Body() dto: ApprovalDecisionDto) { return this.gateway.decideApproval(user, id, dto); }
    @Get("executions") @Permissions({ code: "executions:list", name: "查看工具执行记录" }) executions(@Playground() user: UserPlayground) { return this.gateway.listExecutions(user); }
    @Get("metrics") @Permissions({ code: "metrics:list", name: "查看工具网关指标" }) metrics(@Playground() user: UserPlayground) { return this.gateway.metrics(user); }
    @Post("execute") @Permissions({ code: "execute", name: "测试工具执行" }) execute(@Playground() user: UserPlayground, @Body() dto: ExecuteToolDto) { return this.gateway.execute(user, dto); }
}
