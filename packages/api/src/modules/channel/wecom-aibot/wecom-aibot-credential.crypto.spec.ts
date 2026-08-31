import {
    decryptWecomAibotCredential,
    encryptWecomAibotCredential,
    hasWecomAibotCredentialEncryptionKey,
} from "./wecom-aibot-credential.crypto";

describe("WeCom intelligent robot credential encryption", () => {
    const original = process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY;

    afterEach(() => {
        if (original === undefined) delete process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY;
        else process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY = original;
    });

    it("encrypts credentials with a versioned ciphertext", () => {
        process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY = "wecom-test-key";
        const encrypted = encryptWecomAibotCredential("super-secret");
        expect(encrypted).toMatch(/^v1\./);
        expect(encrypted).not.toContain("super-secret");
        expect(decryptWecomAibotCredential(encrypted)).toBe("super-secret");
    });

    it("fails closed without a channel-specific key", () => {
        delete process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY;
        expect(hasWecomAibotCredentialEncryptionKey()).toBe(false);
        expect(() => encryptWecomAibotCredential("secret")).toThrow(/not configured/i);
    });
});
