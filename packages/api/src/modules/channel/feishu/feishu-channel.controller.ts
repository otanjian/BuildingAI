import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import {
    CreateFeishuConnectionDto,
    UpdateFeishuChannelDto,
    UpdateFeishuConnectionDto,
} from "./dto/update-feishu-channel.dto";
import { QueryFeishuConnectionDto } from "./dto/query-feishu-connection.dto";
import { FeishuChannelService } from "./feishu-channel.service";

@ConsoleController("feishu-channel", "飞书机器人")
export class FeishuChannelController {
    constructor(private readonly feishuChannelService: FeishuChannelService) {}

    @Get()
    @Permissions({ code: "list", name: "查看飞书机器人配置" })
    list() {
        return this.feishuChannelService.list();
    }

    @Get("connections")
    @Permissions({ code: "list", name: "查看飞书连接列表" })
    listConnections(@Query() query: QueryFeishuConnectionDto) {
        return this.feishuChannelService.listConnections(query);
    }

    @Post("connections")
    @Permissions({ code: "create", name: "创建飞书连接" })
    createConnection(@Body() dto: CreateFeishuConnectionDto) {
        return this.feishuChannelService.createConnection(dto);
    }

    @Get("connections/:connectionId")
    @Permissions({ code: "list", name: "查看飞书连接" })
    getConnection(@Param("connectionId") connectionId: string) {
        return this.feishuChannelService.getConnection(connectionId);
    }

    @Put("connections/:connectionId")
    @Permissions({ code: "update", name: "更新飞书连接" })
    updateConnection(
        @Param("connectionId") connectionId: string,
        @Body() dto: UpdateFeishuConnectionDto,
    ) {
        return this.feishuChannelService.updateConnection(connectionId, dto);
    }

    @Post("connections/test")
    @Permissions({ code: "test", name: "测试飞书连接" })
    testConnection(@Body() dto: UpdateFeishuConnectionDto) {
        return this.feishuChannelService.testConnection(dto);
    }

    @Post("connections/:connectionId/test")
    @Permissions({ code: "test", name: "测试飞书连接" })
    testSavedConnection(
        @Param("connectionId") connectionId: string,
        @Body() dto: UpdateFeishuConnectionDto,
    ) {
        return this.feishuChannelService.testConnection({ ...dto, connectionId });
    }

    @Post("connections/:connectionId/toggle")
    @Permissions({ code: "toggle", name: "启停飞书连接" })
    toggleConnection(
        @Param("connectionId") connectionId: string,
        @Body("enabled") enabled: boolean,
    ) {
        return this.feishuChannelService.toggleConnection(connectionId, enabled);
    }

    @Delete("connections/:connectionId")
    @Permissions({ code: "delete", name: "删除飞书连接" })
    deleteConnection(@Param("connectionId") connectionId: string) {
        return this.feishuChannelService.deleteConnection(connectionId);
    }

    @Put(":agentId")
    @Permissions({ code: "update", name: "保存飞书机器人配置" })
    save(@Param("agentId") agentId: string, @Body() dto: UpdateFeishuChannelDto) {
        return this.feishuChannelService.save({ ...dto, agentId });
    }

    @Post(":agentId/test")
    @Permissions({ code: "test", name: "测试飞书机器人连接" })
    test(@Param("agentId") agentId: string, @Body() dto: UpdateFeishuChannelDto) {
        return this.feishuChannelService.test({ ...dto, agentId });
    }

    @Post(":agentId/toggle")
    @Permissions({ code: "toggle", name: "启停飞书机器人" })
    toggle(@Param("agentId") agentId: string, @Body("enabled") enabled: boolean) {
        return this.feishuChannelService.toggle(agentId, enabled);
    }
}
