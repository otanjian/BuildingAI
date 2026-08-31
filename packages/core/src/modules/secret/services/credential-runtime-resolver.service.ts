import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Credential, CredentialVersion } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { CredentialCryptoService } from "../crypto/credential-crypto";

export type CredentialRuntimeScope = {
    tenantId: string;
    projectId?: string | null;
    environment?: string;
    resource?: string;
    action?: string;
};

/** Short-lived runtime resolver used by trusted connectors; never returns metadata to clients. */
@Injectable()
export class CredentialRuntimeResolver {
    constructor(
        @InjectRepository(Credential) private readonly credentials: Repository<Credential>,
        @InjectRepository(CredentialVersion) private readonly versions: Repository<CredentialVersion>,
        private readonly crypto: CredentialCryptoService,
    ) {}

    async resolve(id: string, scope: CredentialRuntimeScope): Promise<string> {
        const row = await this.credentials.findOne({ where: { id, tenantId: scope.tenantId } });
        if (!row || row.status !== "active" || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) {
            throw new Error("Credential is unavailable for this tenant");
        }
        if (scope.projectId !== undefined && row.projectId !== scope.projectId) throw new Error("Credential project scope denied");
        if (scope.environment && row.environment !== scope.environment) throw new Error("Credential environment scope denied");
        if (scope.resource && !row.scopes.some((item) => item.resource === scope.resource && (!scope.action || item.actions.includes(scope.action)))) {
            throw new Error("Credential resource scope denied");
        }
        const version = row.currentVersionId
            ? await this.versions.findOne({ where: { id: row.currentVersionId, credentialId: row.id } })
            : await this.versions.findOne({ where: { credentialId: row.id, revokedAt: null }, order: { version: "DESC" } });
        if (!version || version.revokedAt || (version.expiresAt && version.expiresAt.getTime() <= Date.now())) throw new Error("Credential version is unavailable");
        return this.crypto.decrypt({ algorithm: version.algorithm as any, keyVersion: version.keyVersion, nonce: version.nonce, authTag: version.authTag, ciphertext: version.ciphertext });
    }
}
