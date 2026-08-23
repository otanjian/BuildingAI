import { buildOpencodeSessionContext } from "./opencode-session-context";

describe("buildOpencodeSessionContext", () => {
    it("includes the login username and personal parameters", () => {
        const result = buildOpencodeSessionContext({
            username: "S2385",
            personalParams: { "sap链接参数": "conn=/H/sap/S/3200", region: "CN" },
        });
        expect(result).toContain("login username: S2385");
        expect(result).toContain("- sap链接参数: conn=/H/sap/S/3200");
        expect(result).toContain("- region: CN");
    });

    it("replaces configured sensitive words before returning context", () => {
        const result = buildOpencodeSessionContext({
            username: "secret-user",
            personalParams: { connection: "secret-host" },
            sensitiveWordConfig: {
                enabled: true,
                rules: [{ word: "secret", replacement: "[redacted]" }],
            },
        });
        expect(result).toContain("[redacted]-user");
        expect(result).not.toContain("secret");
    });

    it("masks obvious credential parameter keys", () => {
        const result = buildOpencodeSessionContext({
            username: "user",
            personalParams: { password: "plain-password", "api_token": "plain-token" },
        });
        expect(result).toContain("password: [masked]");
        expect(result).toContain("api_token: [masked]");
        expect(result).not.toContain("plain-password");
        expect(result).not.toContain("plain-token");
    });

    it("masks credentials embedded in SAP connection parameter text", () => {
        const result = buildOpencodeSessionContext({
            personalParams: {
                "sap链接参数": "conn=/H/sap.goodsap.cn/S/3200&clnt=200&user=S2385&lang=zh，密码是Rock123",
            },
        });
        expect(result).toContain("密码是[masked]");
        expect(result).not.toContain("Rock123");
    });

    it("returns undefined when no context exists", () => {
        expect(buildOpencodeSessionContext({})).toBeUndefined();
    });

    it("bounds oversized context", () => {
        const result = buildOpencodeSessionContext({
            username: "user",
            personalParams: { large: "x".repeat(30_000) },
        });
        expect(result?.length).toBeLessThanOrEqual(24_000 + "\n[context truncated]".length);
        expect(result).toContain("[context truncated]");
    });
});
