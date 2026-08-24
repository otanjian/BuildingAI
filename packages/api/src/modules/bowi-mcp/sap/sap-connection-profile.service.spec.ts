jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import type { BowiPrincipal } from "../types/bowi-mcp.types";
import { SapConnectionProfileService, SapProfileError } from "./sap-connection-profile.service";

const principal = (subjectUserId?: string): BowiPrincipal => ({
    actor: { kind: "runtime", id: "managed-opencode" },
    ...(subjectUserId ? { subjectUserId } : {}),
    authSource: "opencode_session",
    capabilities: new Set(["sap.read"]),
});

describe("SapConnectionProfileService", () => {
    const previousEnv = process.env;

    beforeEach(() => {
        process.env = { ...previousEnv, NODE_ENV: "test" };
        delete process.env.BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED;
    });

    afterAll(() => {
        process.env = previousEnv;
    });

    it("resolves a subject-owned PyRFC profile without exposing its secret", async () => {
        const userDict = {
            getGroupValues: jest.fn().mockResolvedValue({
                sap_ashost: "sap.internal",
                sap_sysnr: "00",
                sap_client: "100",
                sap_user: "DEVELOPER",
                sap_password: "top-secret",
                sap_language: "EN",
            }),
        };
        const service = new SapConnectionProfileService(userDict as never);

        const profile = await service.resolvePyrfc(principal("user-1"));

        expect(profile).toMatchObject({
            ashost: "sap.internal",
            sysnr: "00",
            client: "100",
            user: "DEVELOPER",
            password: "top-secret",
        });
        expect(service.publicInfo(profile)).not.toHaveProperty("password");
        expect(service.fingerprint("user-1", profile)).not.toContain("top-secret");
        expect(userDict.getGroupValues).toHaveBeenCalledWith("user-1", "personalParams");
    });

    it("parses the existing composite SAP connection parameter with structured overrides", async () => {
        const userDict = {
            getGroupValues: jest.fn().mockResolvedValue({
                sap链接参数:
                    "conn=/H/router.example/S/3299/H/sap.goodsap.cn/S/3201&clnt=200&user=S2385&lang=zh，密码是secret",
                sap_client: "300",
            }),
        };
        const service = new SapConnectionProfileService(userDict as never);

        const profile = await service.resolvePyrfc(principal("user-1"));

        expect(profile).toEqual(
            expect.objectContaining({
                ashost: "sap.goodsap.cn",
                sysnr: "01",
                client: "300",
                user: "S2385",
                password: "secret",
                language: "ZH",
                saprouter: "/H/router.example/S/3299",
            }),
        );
        expect(JSON.stringify(service.publicInfo(profile))).not.toContain("secret");
    });

    it("rejects missing subjects and incomplete profiles", async () => {
        const userDict = { getGroupValues: jest.fn().mockResolvedValue({}) };
        const service = new SapConnectionProfileService(userDict as never);

        await expect(service.resolvePyrfc(principal())).rejects.toBeInstanceOf(SapProfileError);
        await expect(service.resolvePyrfc(principal("user-1"))).rejects.toMatchObject({
            code: "SAP_PROFILE_REQUIRED",
        });
    });

    it("requires an explicit switch before using the ADT service profile", () => {
        const service = new SapConnectionProfileService({} as never);
        expect(() => service.requireAdtServiceProfile(principal("user-1"))).toThrow(
            "ADT service profile is disabled",
        );

        process.env.BOWI_SAP_ADT_SERVICE_PROFILE_ENABLED = "true";
        expect(service.requireAdtServiceProfile(principal("user-1"))).toEqual({ mode: "service" });
    });
});
