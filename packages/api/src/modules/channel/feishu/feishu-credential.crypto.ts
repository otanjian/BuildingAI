import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
    const raw = process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY?.trim();
    if (!raw) throw new Error("FEISHU_CREDENTIAL_ENCRYPTION_KEY is not configured");
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
    try {
        const decoded = Buffer.from(raw, "base64");
        if (decoded.length === 32) return decoded;
    } catch {
        // Fall through to the deterministic environment-key derivation.
    }
    return createHash("sha256").update(raw).digest();
}

export function encryptFeishuCredential(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, getKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
        VERSION,
        iv.toString("base64url"),
        tag.toString("base64url"),
        ciphertext.toString("base64url"),
    ].join(".");
}

export function decryptFeishuCredential(value: string): string {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(".");
    if (version !== VERSION || !ivValue || !tagValue || !ciphertextValue) {
        throw new Error("Unsupported Feishu credential ciphertext");
    }
    const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, "base64url")),
        decipher.final(),
    ]).toString("utf8");
}

export function hasFeishuCredentialEncryptionKey(): boolean {
    return Boolean(process.env.FEISHU_CREDENTIAL_ENCRYPTION_KEY?.trim());
}
