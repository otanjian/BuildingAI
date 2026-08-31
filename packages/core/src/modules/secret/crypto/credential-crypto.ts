import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { Injectable } from "@nestjs/common";

export const CREDENTIAL_ENVELOPE_ALGORITHM = "aes-256-gcm" as const;

export interface CredentialEnvelope {
    algorithm: typeof CREDENTIAL_ENVELOPE_ALGORITHM;
    keyVersion: string;
    nonce: string;
    authTag: string;
    ciphertext: string;
}

/**
 * Local KMS-compatible provider. Production must provide an explicit key;
 * development/test environments use a clearly marked local-only fallback.
 */
@Injectable()
export class CredentialCryptoService {
    private readonly key: Buffer;
    private readonly keyVersion: string;

    constructor() {
        const configuredKey = process.env.BUILDINGAI_CREDENTIAL_KMS_KEY?.trim();
        const isProduction = process.env.NODE_ENV === "production";
        const provider = process.env.BUILDINGAI_CREDENTIAL_PROVIDER?.trim().toLowerCase();
        if (isProduction && provider && !["kms", "vault"].includes(provider)) {
            throw new Error("Production credential provider must be kms or vault");
        }
        if (isProduction && !configuredKey) {
            throw new Error("The credential KMS key must be configured in production");
        }

        const source = configuredKey || "buildingai-local-development-credential-key";
        this.key = createHash("sha256").update(source).digest();
        this.keyVersion = configuredKey ? "configured-v1" : "local-dev-v1";
    }

    encrypt(plaintext: string): CredentialEnvelope {
        const nonce = randomBytes(12);
        const cipher = createCipheriv(CREDENTIAL_ENVELOPE_ALGORITHM, this.key, nonce);
        const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
        return {
            algorithm: CREDENTIAL_ENVELOPE_ALGORITHM,
            keyVersion: this.keyVersion,
            nonce: nonce.toString("base64url"),
            authTag: cipher.getAuthTag().toString("base64url"),
            ciphertext: ciphertext.toString("base64url"),
        };
    }

    encryptStored(plaintext: string): string {
        return `v1:${Buffer.from(JSON.stringify(this.encrypt(plaintext))).toString("base64url")}`;
    }

    decryptStored(value: string): string {
        if (!value.startsWith("v1:")) {
            // Legacy Base64 values are read only during the migration window.
            try {
                return Buffer.from(value, "base64").toString("utf8");
            } catch {
                throw new Error("Credential decryption failed");
            }
        }
        let envelope: CredentialEnvelope;
        try {
            envelope = JSON.parse(Buffer.from(value.slice(3), "base64url").toString("utf8")) as CredentialEnvelope;
        } catch {
            throw new Error("Credential decryption failed");
        }
        return this.decrypt(envelope);
    }

    decrypt(envelope: CredentialEnvelope): string {
        try {
            if (envelope.algorithm !== CREDENTIAL_ENVELOPE_ALGORITHM) {
                throw new Error("Unsupported credential encryption algorithm");
            }
            const decipher = createDecipheriv(
                CREDENTIAL_ENVELOPE_ALGORITHM,
                this.key,
                Buffer.from(envelope.nonce, "base64url"),
            );
            decipher.setAuthTag(Buffer.from(envelope.authTag, "base64url"));
            return Buffer.concat([
                decipher.update(Buffer.from(envelope.ciphertext, "base64url")),
                decipher.final(),
            ]).toString("utf8");
        } catch {
            throw new Error("Credential decryption failed");
        }
    }

    fingerprint(value: string): string {
        return createHash("sha256").update(value).digest("hex");
    }

    mask(value: string): string {
        if (!value) return "••••";
        if (value.length <= 8) return "••••";
        return `${value.slice(0, 4)}••••${value.slice(-4)}`;
    }
}
