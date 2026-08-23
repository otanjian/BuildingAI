import {
    DEFAULT_OPENCODE_INTERNAL_KEY,
    extractOpencodePassword,
    isMaskedOpencodeCredential,
    resolveOpencodeCredentialOverrides,
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
});
