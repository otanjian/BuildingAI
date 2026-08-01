import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import {
    Department,
    DepartmentUserIndex,
    Extension,
    ExtensionFeature,
    MembershipLevels,
    Permission,
    Role,
    User,
    UserSubscription,
    UserToken,
} from "@buildingai/db/entities";
import { AuthService } from "@common/modules/auth/services/auth.service";
import { ExtensionFeatureService } from "@common/modules/auth/services/extension-feature.service";
import { ExtensionFeatureScanService } from "@common/modules/auth/services/extension-feature-scan.service";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { UserTokenService } from "@common/modules/auth/services/user-token.service";
import { SmsModule } from "@common/modules/sms/sms.module";
import { WechatOaService } from "@common/modules/wechat/services/wechatoa.service";
import { ChannelModule } from "@modules/channel/channel.module";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { StringValue } from "ms";

import { AuthWebController } from "./controller/web/auth.controller";

const DEVELOPMENT_JWT_SECRET = "BuildingAI";
const INSECURE_JWT_SECRETS = new Set(["buildingai", "BuildingAI", "change-me", "changeme"]);

function resolveJwtSecret(configService: ConfigService): string {
    const jwtSecret = configService.get<string>("JWT_SECRET")?.trim();

    if (process.env.NODE_ENV === "production") {
        if (
            !jwtSecret ||
            jwtSecret.length < 32 ||
            INSECURE_JWT_SECRETS.has(jwtSecret)
        ) {
            throw new Error(
                "JWT_SECRET must be set to a strong random value with at least 32 characters in production.",
            );
        }
    }

    return jwtSecret || DEVELOPMENT_JWT_SECRET;
}

/**
 * 认证模块
 *
 * 处理用户认证、授权相关功能
 */
@Module({
    imports: [
        SmsModule,
        HttpModule,
        TypeOrmModule.forFeature([
            User,
            Role,
            Permission,
            UserToken,
            Extension,
            ExtensionFeature,
            MembershipLevels,
            UserSubscription,
            Department,
            DepartmentUserIndex,
        ]),
        ChannelModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: resolveJwtSecret(configService),
                signOptions: {
                    expiresIn:
                        (configService.get<string>("JWT_EXPIRES_IN") as StringValue) || "24h",
                },
            }),
        }),
    ],
    controllers: [AuthWebController],
    providers: [
        AuthService,
        ExtensionFeatureScanService,
        ExtensionFeatureService,
        RolePermissionService,
        UserTokenService,
        WechatOaService,
    ],
    exports: [
        AuthService,
        ExtensionFeatureScanService,
        ExtensionFeatureService,
        JwtModule,
        RolePermissionService,
        UserTokenService,
    ],
})
export class AuthModule {}
