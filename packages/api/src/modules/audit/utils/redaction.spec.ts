import { redactAndDigest, redactPayload } from "./redaction";

describe("structured redaction", () => {
    it("masks credentials and PII while preserving safe metadata", () => {
        const output = redactPayload({ authorization: "Bearer secret", email: "alice@example.com", operation: "chat" }) as Record<string, unknown>;
        expect(output.authorization).toBe("[REDACTED_SECRET]");
        expect(output.email).toBe("al***");
        expect(output.operation).toBe("chat");
    });

    it("returns a stable payload digest", () => {
        const first = redactAndDigest({ token: "a", value: 1 });
        const second = redactAndDigest({ token: "a", value: 1 });
        expect(first.digest).toBe(second.digest);
        expect((first.redacted as Record<string, unknown>).token).toBe("[REDACTED_SECRET]");
    });
});
