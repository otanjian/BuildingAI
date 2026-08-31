jest.mock("@buildingai/db/@nestjs/typeorm", () => ({ InjectRepository: () => () => undefined }));
jest.mock("@buildingai/db/entities", () => ({ Credential: class Credential {}, CredentialVersion: class CredentialVersion {} }));
jest.mock("@buildingai/db/typeorm", () => ({}));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));
jest.mock("@buildingai/core/modules", () => ({ CredentialCryptoService: class CredentialCryptoService {} }));
jest.mock("@nestjs/common", () => ({ Injectable: () => (target: unknown) => target, Optional: () => () => undefined }));

import { CredentialService } from "./credential.service";

describe("CredentialService tenant and lifecycle boundaries", () => {
    const user = (roleCode = "admin") => ({ id: "user-a", username: "a", isRoot: 0, permissions: [], role: null, tenantId: "tenant-a", tenantRoleCode: roleCode } as any);
    const crypto = {
        encrypt: jest.fn(() => ({ algorithm: "aes-256-gcm", keyVersion: "v1", nonce: "n", authTag: "t", ciphertext: "c" })),
        decrypt: jest.fn(() => "secret-value"),
        fingerprint: jest.fn(() => "fp"),
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("denies read-only tenant members before touching credential records", async () => {
        const repo = { find: jest.fn(), findOne: jest.fn() };
        const service = new CredentialService(repo as any, repo as any, crypto);
        await expect(service.list(user("viewer"))).rejects.toThrow(/administrators/);
        expect(repo.find).not.toHaveBeenCalled();
    });

    it("does not resolve a credential across environment or scope boundaries", async () => {
        const credential = { id: "cred-a", tenantId: "tenant-a", status: "active", environment: "sandbox", scopes: [{ resource: "sap", actions: ["read"] }], currentVersionId: "version-a", lastUsedAt: null };
        const credentials = { findOne: jest.fn(async ({ where }: any) => where.id === "cred-a" ? credential : null), save: jest.fn() };
        const versions = { findOne: jest.fn(async () => ({ id: "version-a", credentialId: "cred-a", version: 1, revokedAt: null, expiresAt: null, algorithm: "aes-256-gcm", keyVersion: "v1", nonce: "n", authTag: "t", ciphertext: "c" })) };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        await expect(service.resolve(user(), "cred-a", { environment: "production" })).rejects.toThrow(/environment/);
        await expect(service.resolve(user(), "cred-a", { resource: "sap", action: "write" })).rejects.toThrow(/scope/);
        expect(crypto.decrypt).not.toHaveBeenCalled();
    });

    it("resolves only the current version and records last use", async () => {
        const credential = { id: "cred-a", tenantId: "tenant-a", status: "active", environment: "sandbox", scopes: [{ resource: "sap", actions: ["read"] }], currentVersionId: "version-a", lastUsedAt: null };
        const credentials = { findOne: jest.fn(async () => credential), save: jest.fn() };
        const versions = { findOne: jest.fn(async () => ({ id: "version-a", credentialId: "cred-a", version: 2, revokedAt: null, expiresAt: null, algorithm: "aes-256-gcm", keyVersion: "v1", nonce: "n", authTag: "t", ciphertext: "c" })) };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        await expect(service.resolve(user(), "cred-a", { environment: "sandbox", resource: "sap", action: "read" })).resolves.toMatchObject({ secret: "secret-value", version: 2 });
        expect(credentials.save).toHaveBeenCalled();
    });

    it("rejects an expired credential before decrypting", async () => {
        const credential = {
            id: "cred-expired",
            tenantId: "tenant-a",
            status: "active",
            expiresAt: new Date(Date.now() - 1),
            environment: "production",
            scopes: [{ resource: "mcp", actions: ["connect"] }],
            currentVersionId: "version-expired",
        };
        const credentials = { findOne: jest.fn().mockResolvedValue(credential), save: jest.fn() };
        const versions = { findOne: jest.fn() };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        await expect(service.resolve(user(), credential.id, { environment: "production", resource: "mcp", action: "connect" })).rejects.toThrow(/revoked or expired/);
        expect(crypto.decrypt).not.toHaveBeenCalled();
    });

    it("rejects a revoked current version without falling back to an older version", async () => {
        const credential = {
            id: "cred-revoked",
            tenantId: "tenant-a",
            status: "active",
            expiresAt: null,
            environment: "production",
            scopes: [{ resource: "mcp", actions: ["connect"] }],
            currentVersionId: "version-2",
        };
        const credentials = { findOne: jest.fn().mockResolvedValue(credential), save: jest.fn() };
        const versions = { findOne: jest.fn().mockResolvedValue({ id: "version-2", credentialId: credential.id, version: 2, revokedAt: new Date(), expiresAt: null }) };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        await expect(service.resolve(user(), credential.id, { environment: "production", resource: "mcp", action: "connect" })).rejects.toThrow(/revoked or expired/);
        expect(crypto.decrypt).not.toHaveBeenCalled();
    });

    it("creates a new preferred version while preserving an overlap window", async () => {
        const credential = { id: "cred-rotate", tenantId: "tenant-a", status: "active", environment: "production", scopes: [], currentVersionId: "version-1", expiresAt: null };
        const credentials = { findOne: jest.fn().mockResolvedValue(credential), save: jest.fn().mockResolvedValue(credential) };
        const versions = {
            findOne: jest.fn().mockResolvedValue({ version: 1 }),
            create: jest.fn((value) => value),
            save: jest.fn((value) => Promise.resolve({ id: "version-2", ...value })),
        };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        const result = await service.rotate(user(), credential.id, { secret: "next-secret" });
        expect(result.version).toBe(2);
        expect(versions.create).toHaveBeenCalledWith(expect.objectContaining({ version: 2, overlapUntil: expect.any(Date) }));
        expect(credentials.save).toHaveBeenCalledWith(expect.objectContaining({ currentVersionId: "version-2" }));
    });

    it("does not accept a credential scope from another project", async () => {
        const credential = { id: "cred-project", tenantId: "tenant-a", projectId: "project-b", status: "active", environment: "production", scopes: [{ resource: "mcp", actions: ["connect"] }], currentVersionId: "version-1" };
        const credentials = { findOne: jest.fn().mockResolvedValue(credential), save: jest.fn() };
        const versions = { findOne: jest.fn() };
        const service = new CredentialService(credentials as any, versions as any, crypto);
        await expect(service.resolve({ ...user(), projectId: "project-a" } as any, credential.id, { environment: "production", resource: "mcp", action: "connect" })).rejects.toThrow(/not found/);
        expect(versions.findOne).not.toHaveBeenCalled();
    });
});
