import { TypeOrmModule } from "@buildingai/db/@nestjs/typeorm";
import { AiProvider } from "@buildingai/db/entities";
import { SecretTemplate } from "@buildingai/db/entities";
import { Secret } from "@buildingai/db/entities";
import { Credential, CredentialVersion } from "@buildingai/db/entities";
import { Global, Module } from "@nestjs/common";

import { SecretService } from "./services/secret.service";
import { SecretTemplateService } from "./services/secret-template.service";
import { CredentialCryptoService } from "./crypto/credential-crypto";
import { CredentialRuntimeResolver } from "./services/credential-runtime-resolver.service";

/**
 * Secret Module (Global)
 *
 * Provides centralized secret and secret template management functionality.
 * This module is global, so you don't need to import it in every module.
 * Just import it once in your root module (e.g., AppModule).
 *
 * @example
 * ```ts
 * // In your module
 * import { SecretModule } from '@buildingai/core/modules/secret';
 *
 * @Module({
 *   imports: [SecretModule],
 *   // ...
 * })
 * export class YourModule {}
 * ```
 */
@Global()
@Module({
    imports: [TypeOrmModule.forFeature([Secret, SecretTemplate, AiProvider, Credential, CredentialVersion])],
    providers: [SecretTemplateService, SecretService, CredentialCryptoService, CredentialRuntimeResolver],
    exports: [
        SecretTemplateService,
        SecretService,
        CredentialCryptoService,
        CredentialRuntimeResolver,
        TypeOrmModule.forFeature([Secret, SecretTemplate, AiProvider, Credential, CredentialVersion]),
    ],
})
export class SecretModule {}
