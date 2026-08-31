import type { UserPlayground } from "@buildingai/db";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Credential, CredentialVersion, Project, TenantAuditEvent } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { CredentialCryptoService } from "@buildingai/core/modules";
import { Injectable, Optional } from "@nestjs/common";

import { CreateCredentialDto, RotateCredentialDto } from "../dto/credential.dto";

export type CredentialMetadata = {
    id: string;
    name: string;
    provider: string;
    purpose: string;
    projectId: string | null;
    environment: string;
    status: string;
    version: number;
    keyVersion: string;
    fingerprint: string;
    maskedValue: string;
    expiresAt: Date | null;
    lastUsedAt: Date | null;
    createdAt: Date;
};

@Injectable()
export class CredentialService {
    constructor(
        @InjectRepository(Credential)
        private readonly credentials: Repository<Credential>,
        @InjectRepository(CredentialVersion)
        private readonly versions: Repository<CredentialVersion>,
        private readonly crypto: CredentialCryptoService,
        @Optional() @InjectRepository(Project) private readonly projects?: Repository<Project>,
        @Optional() @InjectRepository(TenantAuditEvent) private readonly auditRepository?: Repository<TenantAuditEvent>,
    ) {}

    async list(user: UserPlayground): Promise<CredentialMetadata[]> {
        this.requireCredentialAdministrator(user);
        const tenantId = user.tenantId;
        if (!tenantId) throw HttpErrorFactory.badRequest("Select an active tenant before using credentials");
        const rows = await this.credentials.find({ where: { tenantId }, order: { createdAt: "DESC" } });
        return Promise.all(rows.map((row) => this.toMetadata(row)));
    }

    async create(user: UserPlayground, dto: CreateCredentialDto): Promise<CredentialMetadata> {
        this.requireCredentialAdministrator(user);
        const tenantId = this.requireTenant(user);
        await this.assertProjectScope(tenantId, dto.projectId);
        const existing = await this.credentials.findOne({ where: { tenantId, projectId: dto.projectId ?? null, name: dto.name } });
        if (existing) throw HttpErrorFactory.business("Credential name already exists in this scope");
        const row = this.credentials.create({
            tenantId,
            projectId: dto.projectId ?? null,
            name: dto.name.trim(),
            provider: dto.provider.trim(),
            purpose: dto.purpose.trim(),
            environment: dto.environment?.trim() || "development",
            scopes: dto.scopes || [],
            status: "active",
            currentVersionId: null,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            lastUsedAt: null,
            createdBy: user.id,
            revokedBy: null,
            revokedAt: null,
        });
        const saved = await this.credentials.save(row);
        const version = await this.createVersion(saved, dto.secret, user.id, 1, saved.expiresAt);
        saved.currentVersionId = version.id;
        await this.credentials.save(saved);
        await this.audit(user, "credential.create", saved.id, { version: 1, purpose: saved.purpose });
        return this.toMetadata(saved, version);
    }

    async rotate(user: UserPlayground, id: string, dto: RotateCredentialDto): Promise<CredentialMetadata> {
        this.requireCredentialAdministrator(user);
        const row = await this.findScoped(user, id);
        if (row.status !== "active") throw HttpErrorFactory.forbidden("Only active credentials can be rotated");
        const latest = await this.versions.findOne({ where: { credentialId: row.id }, order: { version: "DESC" } });
        const version = await this.createVersion(row, dto.secret, user.id, (latest?.version || 0) + 1, dto.expiresAt ? new Date(dto.expiresAt) : row.expiresAt, new Date(Date.now() + 24 * 60 * 60 * 1000));
        row.currentVersionId = version.id;
        row.expiresAt = version.expiresAt;
        await this.credentials.save(row);
        await this.audit(user, "credential.rotate", row.id, { version: version.version, overlapUntil: version.overlapUntil });
        return this.toMetadata(row, version);
    }

    async revoke(user: UserPlayground, id: string): Promise<CredentialMetadata> {
        this.requireCredentialAdministrator(user);
        const row = await this.findScoped(user, id);
        row.status = "revoked";
        row.revokedAt = new Date();
        row.revokedBy = user.id;
        await this.versions.update({ credentialId: row.id }, { revokedAt: new Date() });
        const saved = await this.credentials.save(row);
        await this.audit(user, "credential.revoke", saved.id, { status: saved.status });
        return this.toMetadata(saved);
    }

    async testConnection(user: UserPlayground, id: string) {
        this.requireCredentialAdministrator(user);
        const row = await this.findScoped(user, id);
        this.assertUsable(row);
        row.lastUsedAt = new Date();
        await this.credentials.save(row);
        await this.audit(user, "credential.test", row.id, { status: "connected" });
        return { ok: true, status: "connected", credentialId: row.id, testedAt: row.lastUsedAt };
    }

    /** Resolve one credential for a trusted short-lived tool execution. */
    async resolve(
        user: UserPlayground,
        id: string,
        options?: { environment?: string; resource?: string; action?: string },
    ): Promise<{ secret: string; credentialId: string; version: number; expiresAt: Date | null }> {
        const row = await this.findScoped(user, id);
        this.assertUsable(row);
        if (options?.environment && options.environment !== row.environment) {
            throw HttpErrorFactory.forbidden("Credential environment is outside the current execution scope");
        }
        if (options?.resource && !row.scopes.some((scope) => scope.resource === options.resource && (!options.action || scope.actions.includes(options.action)))) {
            throw HttpErrorFactory.forbidden("Credential scope is outside the current execution");
        }
        const version = row.currentVersionId
            ? await this.versions.findOne({ where: { id: row.currentVersionId, credentialId: row.id } })
            : await this.versions.findOne({ where: { credentialId: row.id, revokedAt: null }, order: { version: "DESC" } });
        if (!version || version.revokedAt || (version.expiresAt && version.expiresAt.getTime() <= Date.now())) {
            throw HttpErrorFactory.forbidden("Credential version is revoked or expired");
        }
        const secret = this.crypto.decrypt({
            algorithm: version.algorithm as any,
            keyVersion: version.keyVersion,
            nonce: version.nonce,
            authTag: version.authTag,
            ciphertext: version.ciphertext,
        });
        row.lastUsedAt = new Date();
        await this.credentials.save(row);
        await this.audit(user, "credential.resolve", row.id, { version: version.version, environment: row.environment });
        return { secret, credentialId: row.id, version: version.version, expiresAt: version.expiresAt };
    }

    private requireTenant(user: UserPlayground): string {
        if (!user.tenantId) throw HttpErrorFactory.badRequest("Select an active tenant before using credentials");
        return user.tenantId;
    }

    assertAdministrator(user: UserPlayground): void {
        this.requireCredentialAdministrator(user);
    }

    private async assertProjectScope(tenantId: string, projectId?: string | null): Promise<void> {
        if (!projectId || !this.projects) return;
        const project = await this.projects.findOne({ where: { id: projectId, tenantId } });
        if (!project) throw HttpErrorFactory.notFound("Project not found in the active tenant");
    }

    private async audit(user: UserPlayground, action: string, resourceId: string, metadata: Record<string, unknown>): Promise<void> {
        if (!this.auditRepository || !user.tenantId) return;
        await this.auditRepository.save(this.auditRepository.create({
            tenantId: user.tenantId,
            actorId: user.id,
            action,
            outcome: action === "credential.resolve" || action === "credential.test" ? "allowed" : "changed",
            resourceType: "credential",
            resourceId,
            metadata,
        }));
    }

    /** Credential metadata and runtime actions are tenant-admin operations. */
    private requireCredentialAdministrator(user: UserPlayground): void {
        if (user.isRoot || user.tenantRoleCode === "owner" || user.tenantRoleCode === "admin") return;
        throw HttpErrorFactory.forbidden("Only tenant administrators can manage credentials");
    }

    private async findScoped(user: UserPlayground, id: string): Promise<Credential> {
        const row = await this.credentials.findOne({ where: { id, tenantId: this.requireTenant(user) } });
        if (!row) throw HttpErrorFactory.notFound("Credential not found");
        if (user.projectId !== undefined && row.projectId !== user.projectId) {
            throw HttpErrorFactory.notFound("Credential not found");
        }
        return row;
    }

    private assertUsable(row: Credential): void {
        if (row.status !== "active" || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) {
            throw HttpErrorFactory.forbidden("Credential is revoked or expired");
        }
    }

    private async createVersion(row: Credential, secret: string, userId: string, version: number, expiresAt: Date | null, overlapUntil: Date | null = null) {
        const envelope = this.crypto.encrypt(secret);
        return this.versions.save(this.versions.create({
            credentialId: row.id,
            version,
            algorithm: envelope.algorithm,
            keyVersion: envelope.keyVersion,
            nonce: envelope.nonce,
            authTag: envelope.authTag,
            ciphertext: envelope.ciphertext,
            fingerprint: this.crypto.fingerprint(secret),
            expiresAt,
            overlapUntil,
            revokedAt: null,
            createdBy: userId,
        }));
    }

    private async toMetadata(row: Credential, knownVersion?: CredentialVersion): Promise<CredentialMetadata> {
        const version = knownVersion || (row.currentVersionId ? await this.versions.findOne({ where: { id: row.currentVersionId } }) : null) || await this.versions.findOne({ where: { credentialId: row.id }, order: { version: "DESC" } });
        return {
            id: row.id,
            name: row.name,
            provider: row.provider,
            purpose: row.purpose,
            projectId: row.projectId,
            environment: row.environment,
            status: row.status,
            version: version?.version || 0,
            keyVersion: version?.keyVersion || "unknown",
            fingerprint: version?.fingerprint || "",
            maskedValue: "••••",
            expiresAt: row.expiresAt,
            lastUsedAt: row.lastUsedAt,
            createdAt: row.createdAt,
        };
    }
}
