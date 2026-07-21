import { type UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { ConsoleMcpApiKey, User } from "@buildingai/db/entities";
import { IsNull, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { isDisabled } from "@buildingai/utils";
import { RolePermissionService } from "@common/modules/auth/services/role-permission.service";
import { Injectable } from "@nestjs/common";

import {
    generateConsoleMcpApiKey,
    hashConsoleMcpApiKey,
    prefixConsoleMcpApiKey,
} from "../crypto/console-mcp-key.crypto";

export type ConsoleMcpApiKeyListItem = {
    id: string;
    label: string;
    keyPrefix: string;
    createdAt: Date;
    lastUsedAt: Date | null;
    revokedAt: Date | null;
};

export type ConsoleMcpApiKeyCreateResult = ConsoleMcpApiKeyListItem & {
    /** Raw secret — returned only once on create. */
    secret: string;
};

@Injectable()
export class ConsoleMcpApiKeyService {
    constructor(
        @InjectRepository(ConsoleMcpApiKey)
        private readonly keyRepository: Repository<ConsoleMcpApiKey>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly rolePermissionService: RolePermissionService,
    ) {}

    async create(userId: string, label: string): Promise<ConsoleMcpApiKeyCreateResult> {
        const trimmed = label?.trim();
        if (!trimmed) {
            throw HttpErrorFactory.badRequest("Label is required");
        }

        const secret = generateConsoleMcpApiKey();
        const entity = this.keyRepository.create({
            userId,
            label: trimmed,
            keyHash: hashConsoleMcpApiKey(secret),
            keyPrefix: prefixConsoleMcpApiKey(secret),
            revokedAt: null,
            lastUsedAt: null,
        });
        const saved = await this.keyRepository.save(entity);

        return {
            id: saved.id,
            label: saved.label,
            keyPrefix: saved.keyPrefix,
            createdAt: saved.createdAt,
            lastUsedAt: saved.lastUsedAt,
            revokedAt: saved.revokedAt,
            secret,
        };
    }

    async listForUser(userId: string): Promise<ConsoleMcpApiKeyListItem[]> {
        const rows = await this.keyRepository.find({
            where: { userId },
            order: { createdAt: "DESC" },
        });

        return rows.map((row) => ({
            id: row.id,
            label: row.label,
            keyPrefix: row.keyPrefix,
            createdAt: row.createdAt,
            lastUsedAt: row.lastUsedAt,
            revokedAt: row.revokedAt,
        }));
    }

    async revoke(userId: string, keyId: string): Promise<void> {
        const key = await this.keyRepository.findOne({
            where: { id: keyId, userId },
        });
        if (!key) {
            throw HttpErrorFactory.notFound("API key not found");
        }
        if (key.revokedAt) {
            return;
        }
        key.revokedAt = new Date();
        await this.keyRepository.save(key);
    }

    /**
     * Authenticate an MCP Bearer key and return a full UserPlayground.
     */
    async authenticate(rawKey: string): Promise<UserPlayground> {
        if (!rawKey?.trim()) {
            throw HttpErrorFactory.unauthorized("Missing Console MCP API key");
        }

        const keyHash = hashConsoleMcpApiKey(rawKey.trim());
        const key = await this.keyRepository.findOne({
            where: { keyHash, revokedAt: IsNull() },
        });

        if (!key) {
            throw HttpErrorFactory.unauthorized("Invalid or revoked Console MCP API key");
        }

        const user = await this.userRepository.findOne({ where: { id: key.userId } });
        if (!user) {
            throw HttpErrorFactory.unauthorized("Invalid or revoked Console MCP API key");
        }
        if (isDisabled(user.status)) {
            throw HttpErrorFactory.forbidden("The account has been disabled.");
        }

        const role = await this.rolePermissionService.getUserRoles(user.id);
        const permissions = await this.rolePermissionService.getUserPermissions(user.id);

        key.lastUsedAt = new Date();
        await this.keyRepository.save(key);

        return {
            id: user.id,
            username: user.username,
            isRoot: user.isRoot,
            role,
            permissions,
        };
    }
}
