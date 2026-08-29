import {
    decryptFeishuCredential,
    encryptFeishuCredential,
    hasFeishuCredentialEncryptionKey,
} from "./feishu-credential.crypto";

describe("Feishu credential encryption", () => {
    const original = process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY;

    afterEach(() => {
        if (original === undefined) delete process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY;
        else process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY = original;
    });

    it("encrypts and decrypts credentials without storing plaintext", () => {
        process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY = "test-feishu-encryption-key";
        const encrypted = encryptFeishuCredential("super-secret");
        expect(encrypted).not.toContain("super-secret");
        expect(decryptFeishuCredential(encrypted)).toBe("super-secret");
    });

    it("fails closed when the encryption key is missing", () => {
        delete process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY;
        expect(hasFeishuCredentialEncryptionKey()).toBe(false);
        expect(() => encryptFeishuCredential("secret")).toThrow(/not configured/i);
    });
});
