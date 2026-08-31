import { getRepositoryToken, TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    Dict,
    FeishuChannelConnection,
    User,
    WecomAibotConnection,
} from "@buildingai/db/entities";
import { DictCacheService } from "@buildingai/dict";
import { DictService } from "@buildingai/dict";
import { WxOaConfigConsoleController } from "@modules/channel/controller/console/wxoaconfig.controller";
import { WxOaConfigService } from "@modules/channel/services/wxoaconfig.service";
import { Module } from "@nestjs/common";
import { SecretModule } from "@buildingai/core/modules";
import { CredentialRuntimeResolver } from "@buildingai/core/modules";
import { FeishuChannelController } from "./feishu/feishu-channel.controller";
import { FeishuChannelService } from "./feishu/feishu-channel.service";
import { WecomAibotChannelController } from "./wecom-aibot/wecom-aibot-channel.controller";
import { WecomAibotChannelService } from "./wecom-aibot/wecom-aibot-channel.service";
import { WecomAibotClientFactory } from "./wecom-aibot/wecom-aibot-client.factory";

@Module({
    imports: [
        SecretModule,
        TypeOrmModule.forFeature([
            Dict,
            Agent,
            FeishuChannelConnection,
            User,
            WecomAibotConnection,
        ]),
    ],
    controllers: [
        WxOaConfigConsoleController,
        FeishuChannelController,
        WecomAibotChannelController,
    ],
    providers: [
        WxOaConfigService,
        FeishuChannelService,
        WecomAibotChannelService,
        WecomAibotClientFactory,
        DictService,
        DictCacheService,
        { provide: "CREDENTIAL_RUNTIME_RESOLVER", useExisting: CredentialRuntimeResolver },
        {
            provide: "FEISHU_CONNECTION_REPOSITORY",
            useExisting: getRepositoryToken(FeishuChannelConnection),
        },
    ],
    exports: [WxOaConfigService, FeishuChannelService, WecomAibotChannelService],
})
export class ChannelModule {}
