import { SecretModule } from "@buildingai/core/modules";
import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiProvider, Agent, Credential, CredentialVersion, Project, TenantAuditEvent } from "@buildingai/db/entities";
import { AiProviderService } from "@modules/ai/provider/services/ai-provider.service";
import { SecretWebController } from "@modules/ai/secret/controllers/console/secret.controller";
import { SecretTemplateWebController } from "@modules/ai/secret/controllers/console/secret-template.controller";
import { CredentialConsoleController } from "@modules/ai/secret/controllers/console/credential.controller";
import { CredentialService } from "@modules/ai/secret/services/credential.service";
import { CredentialMigrationService } from "@modules/ai/secret/services/credential-migration.service";
import { Module } from "@nestjs/common";

/**
 * 密钥管理模块（API层）
 * 仅包含控制器，业务逻辑在 @buildingai/core/modules/secret
 */
@Module({
    imports: [SecretModule, TypeOrmModule.forFeature([AiProvider, Agent, Credential, CredentialVersion, Project, TenantAuditEvent])],
    controllers: [SecretTemplateWebController, SecretWebController, CredentialConsoleController],
    providers: [
        AiProviderService,
        CredentialService,
        CredentialMigrationService,
        {
            provide: "AI_PROVIDER_SERVICE",
            useExisting: AiProviderService,
        },
    ],
})
export class SecretManagerModule {}
