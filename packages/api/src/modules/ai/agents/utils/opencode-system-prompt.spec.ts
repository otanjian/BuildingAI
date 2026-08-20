import {
    buildOpencodePersonalParamsSection,
    buildOpencodeSystemPrompt,
} from "./opencode-system-prompt";

describe("buildOpencodePersonalParamsSection", () => {
    it("returns undefined for empty params", () => {
        expect(buildOpencodePersonalParamsSection(undefined)).toBeUndefined();
        expect(buildOpencodePersonalParamsSection({})).toBeUndefined();
    });

    it("lists code and value lines", () => {
        const section = buildOpencodePersonalParamsSection({
            sap链接参数: "conn=/H/sap.example/S/3200",
            region: "cn",
        });
        expect(section).toContain("## User personal parameters");
        expect(section).toContain("- sap链接参数: conn=/H/sap.example/S/3200");
        expect(section).toContain("- region: cn");
    });

    it("stringifies non-string values and skips empty codes", () => {
        const section = buildOpencodePersonalParamsSection({
            "  ": "ignored",
            flags: { a: 1 },
            count: 3,
        });
        expect(section).toContain("- flags: {\"a\":1}");
        expect(section).toContain("- count: 3");
        expect(section).not.toContain("ignored");
    });
});

describe("buildOpencodeSystemPrompt", () => {
    const systemHint = "artifact-hint";

    it("returns artifact hint only when role and params are empty", () => {
        expect(
            buildOpencodeSystemPrompt({
                rolePrompt: "   ",
                personalParams: {},
                systemHint,
            }),
        ).toBe(systemHint);
    });

    it("includes role prompt before artifact hint", () => {
        const merged = buildOpencodeSystemPrompt({
            rolePrompt: "You are SAP assistant.",
            systemHint,
        });
        expect(merged).toBe("You are SAP assistant.\n\nartifact-hint");
    });

    it("includes personal params before artifact hint", () => {
        const merged = buildOpencodeSystemPrompt({
            personalParams: { sap链接参数: "conn=x" },
            systemHint,
        });
        expect(merged.startsWith("## User personal parameters")).toBe(true);
        expect(merged).toContain("- sap链接参数: conn=x");
        expect(merged.endsWith("artifact-hint")).toBe(true);
    });

    it("orders role, personal params, then artifact hint", () => {
        const merged = buildOpencodeSystemPrompt({
            rolePrompt: "ROLE",
            personalParams: { k: "v" },
            systemHint,
        });
        const roleIdx = merged.indexOf("ROLE");
        const paramsIdx = merged.indexOf("## User personal parameters");
        const hintIdx = merged.indexOf("artifact-hint");
        expect(roleIdx).toBeGreaterThanOrEqual(0);
        expect(paramsIdx).toBeGreaterThan(roleIdx);
        expect(hintIdx).toBeGreaterThan(paramsIdx);
    });
});
