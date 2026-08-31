import { CredentialCryptoService } from "./credential-crypto";

describe("CredentialCryptoService", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it("encrypts and decrypts a credential with authenticated encryption", () => {
        process.env.NODE_ENV = "test";
        process.env.BUILDINGAI_CREDENTIAL_KMS_KEY = "test-master-key-for-credential-security";
        const crypto = new CredentialCryptoService();

        const envelope = crypto.encrypt("top-secret-value");

        expect(envelope.algorithm).toBe("aes-256-gcm");
        expect(envelope.ciphertext).not.toContain("top-secret-value");
        expect(crypto.decrypt(envelope)).toBe("top-secret-value");
    });

    it("rejects a tampered ciphertext", () => {
        process.env.NODE_ENV = "test";
        process.env.BUILDINGAI_CREDENTIAL_KMS_KEY = "test-master-key-for-credential-security";
        const crypto = new CredentialCryptoService();
        const envelope = crypto.encrypt("top-secret-value");

        expect(() => crypto.decrypt({ ...envelope, ciphertext: `${envelope.ciphertext}x` })).toThrow(
            "Credential decryption failed",
        );
    });

    it("fails closed in production when the KMS key is absent", () => {
        process.env.NODE_ENV = "production";
        delete process.env.BUILDINGAI_CREDENTIAL_KMS_KEY;

        expect(() => new CredentialCryptoService()).toThrow("credential KMS key");
    });

    it("fails closed in production when a development provider is selected", () => {
        process.env.NODE_ENV = "production";
        process.env.BUILDINGAI_CREDENTIAL_KMS_KEY = "configured-production-key";
        process.env.BUILDINGAI_CREDENTIAL_PROVIDER = "local";
        expect(() => new CredentialCryptoService()).toThrow(/provider must be kms or vault/);
    });
});
