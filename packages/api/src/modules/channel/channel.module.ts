import { getRepositoryToken, TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { Agent, Dict, FeishuChannelConnection, User } from "@buildingai/db/entities";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";
import { FeishuChannelController } from "./feishu/feishu-channel.controller";
import { FeishuChannelService } from "./feishu/feishu-channel.service";

@Module({
    imports: [TypeOrmModule.forFeature([Dict, Agent, FeishuChannelConnection, User])],
    controllers: [WxOaConfigConsoleController, FeishuChannelController],
    providers: [
        WxOaConfigService,
        FeishuChannelService,
        DictService,
        DictCacheService,
        {
            provide: "FEISHU_CONNECTION_REPOSITORY",
            useExisting: getRepositoryToken(FeishuChannelConnection),
        },
    ],
    exports: [WxOaConfigService, FeishuChannelService],
})
export class ChannelModule {}
