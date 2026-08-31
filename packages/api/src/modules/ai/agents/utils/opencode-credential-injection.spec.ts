import {
    createOpencodeServiceToken,
    buildOpencodeServiceHeaders,
    consumeOpencodeServiceToken,
    DEFAULT_OPENCODE_INTERNAL_KEY,
    extractOpencodePassword,
    isMaskedOpencodeCredential,
    resolveOpencodeCredentialOverrides,
    verifyOpencodeServiceToken,
} from "./opencode-credential-injection";

describe("OpenCode credential injection", () => {
    it("extracts a password embedded in a SAP connection parameter", () => {
        expect(
            extractOpencodePassword({
                "sap链接参数": "conn=/H/sap.goodsap.cn/S/3200&sysnr=00&client=200&user=S2385&password=Rock123",
            }),
        ).toBe("Rock123");
        expect(extractOpencodePassword({ connection: '"密码":"Rock456"' })).toBe("Rock456");
    });

    it("extracts structured password keys without exposing masked values", () => {
        expect(extractOpencodePassword({ password: "Rock123" })).toBe("Rock123");
        expect(extractOpencodePassword({ password: "[masked]" })).toBeUndefined();
        expect(isMaskedOpencodeCredential("[masked]")).toBe(true);
    });

    it("only adds an override for a SAP connection tool", () => {
        expect(
            resolveOpencodeCredentialOverrides({
                toolName: "sap-pyrfc_sap_connect",
                arguments: { host: "sap.goodsap.cn", password: "[masked]" },
                personalParams: { password: "Rock123" },
            }),
        ).toEqual({ password: "Rock123" });
        expect(
            resolveOpencodeCredentialOverrides({
                toolName: "sap-pyrfc_run_query",
                arguments: {},
                personalParams: { password: "Rock123" },
            }),
        ).toEqual({});
    });

    it("does not overwrite an explicit password", () => {
        expect(
            resolveOpencodeCredentialOverrides({
                toolName: "sap_connect",
                arguments: { password: "UserProvided" },
                personalParams: { password: "Rock123" },
            }),
        ).toEqual({});
    });

    it("keeps the local bridge key configurable", () => {
        expect(DEFAULT_OPENCODE_INTERNAL_KEY).toBeTruthy();
    });

    it("signs and verifies a short-lived audience-bound service token", () => {
        const token = createOpencodeServiceToken("test-worker", 1_700_000_000);
        expect(verifyOpencodeServiceToken(token, 1_700_000_030)).toMatchObject({
            aud: "buildingai-opencode-credential",
            sub: "test-worker",
        });
        expect(() => verifyOpencodeServiceToken(token, 1_700_000_061)).toThrow(/Expired/);
    });

    it("emits only a short-lived service token header", () => {
        const headers = buildOpencodeServiceHeaders("test-worker", 1_700_000_000);
        expect(headers).toHaveProperty("x-buildingai-opencode-token");
        expect(headers).not.toHaveProperty("x-buildingai-opencode-key");
        expect(verifyOpencodeServiceToken(headers["x-buildingai-opencode-token"], 1_700_000_001).sub).toBe("test-worker");
    });

    it("rejects replay of a consumed service token", () => {
        const token = createOpencodeServiceToken("replay-worker", 1_800_000_000);
        expect(consumeOpencodeServiceToken(token, 1_800_000_001).sub).toBe("replay-worker");
        expect(() => consumeOpencodeServiceToken(token, 1_800_000_002)).toThrow(/replay/);
    });
});
