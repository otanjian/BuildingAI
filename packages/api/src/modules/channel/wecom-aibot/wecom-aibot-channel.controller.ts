import { ConsoleController } from "@common/decorators/controller.decorator";
import { Permissions } from "@common/decorators/permissions.decorator";
import { Body, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";

import { QueryWecomAibotConnectionDto } from "./dto/query-wecom-aibot-connection.dto";
import {
    CreateWecomAibotConnectionDto,
    TestWecomAibotConnectionDto,
    ToggleWecomAibotConnectionDto,
    UpdateWecomAibotConnectionDto,
} from "./dto/update-wecom-aibot-connection.dto";
import { WecomAibotChannelService } from "./wecom-aibot-channel.service";

@ConsoleController("wecom-aibot-channel", "企业微信智能机器人")
export class WecomAibotChannelController {
    constructor(private readonly service: WecomAibotChannelService) {}

    @Get("connections")
    @Permissions({ code: "list", name: "查看企业微信连接列表" })
    listConnections(@Query() query: QueryWecomAibotConnectionDto) {
        return this.service.listConnections(query);
    }

    @Post("connections")
    @Permissions({ code: "create", name: "创建企业微信连接" })
    createConnection(@Body() dto: CreateWecomAibotConnectionDto) {
        return this.service.createConnection(dto);
    }

    @Post("connections/test")
    @Permissions({ code: "test", name: "测试企业微信连接" })
    testConnection(@Body() dto: TestWecomAibotConnectionDto) {
        return this.service.testConnection(dto);
    }

    @Get("connections/:connectionId")
    @Permissions({ code: "list", name: "查看企业微信连接" })
    getConnection(@Param("connectionId") connectionId: string) {
        return this.service.getConnection(connectionId);
    }

    @Put("connections/:connectionId")
    @Permissions({ code: "update", name: "更新企业微信连接" })
    updateConnection(
        @Param("connectionId") connectionId: string,
        @Body() dto: UpdateWecomAibotConnectionDto,
    ) {
        return this.service.updateConnection(connectionId, dto);
    }

    @Post("connections/:connectionId/test")
    @Permissions({ code: "test", name: "测试企业微信连接" })
    testSavedConnection(
        @Param("connectionId") connectionId: string,
        @Body() dto: TestWecomAibotConnectionDto,
    ) {
        return this.service.testConnection({ ...dto, connectionId });
    }

    @Post("connections/:connectionId/toggle")
    @Permissions({ code: "toggle", name: "启停企业微信连接" })
    toggleConnection(
        @Param("connectionId") connectionId: string,
        @Body() dto: ToggleWecomAibotConnectionDto,
    ) {
        return this.service.toggleConnection(connectionId, dto.enabled);
    }

    @Delete("connections/:connectionId")
    @Permissions({ code: "delete", name: "删除企业微信连接" })
    deleteConnection(@Param("connectionId") connectionId: string) {
        return this.service.deleteConnection(connectionId);
    }
}
