import {
    buildBuildingAIReportBase,
    buildOpencodeEmbedUrl,
    encodeOpencodeServerKey,
    resolveBuildingAIWebOrigin,
} from "./opencode-embed";

describe("OpenCode iframe URL", () => {
    it("uses OpenCode's URL-safe server route", () => {
        expect(encodeOpencodeServerKey("http://127.0.0.1:4096")).toBe(
            "aHR0cDovLzEyNy4wLjAuMTo0MDk2",
        );
        expect(buildOpencodeEmbedUrl("http://127.0.0.1:4096/", "ses_123")).toBe(
            "http://127.0.0.1:4096/server/aHR0cDovLzEyNy4wLjAuMTo0MDk2/session/ses_123?buildingaiEmbed=1",
        );
    });

    it("does not include credentials from a configured URL", () => {
        const url = buildOpencodeEmbedUrl(
            "https://user:password@example.com:4096/?apiKey=secret",
            "ses/unsafe",
        );
        expect(url).not.toContain("password");
        expect(url).not.toContain("secret");
        expect(url).toBe(
            "https://example.com:4096/server/aHR0cHM6Ly9leGFtcGxlLmNvbTo0MDk2/session/ses%2Funsafe?buildingaiEmbed=1",
        );
    });

    it("propagates a credential-free Bowi AI report context", () => {
        const reportBase = buildBuildingAIReportBase(
            "http://127.0.0.1:4091",
            "agent/id",
            "conversation id",
        );
        const url = new URL(
            buildOpencodeEmbedUrl("http://127.0.0.1:4096", "ses_123", {
                reportBase,
                artifactRoot: "artifacts/conversation id",
            }),
        );

        expect(url.searchParams.get("buildingaiReportBase")).toBe(
            "http://127.0.0.1:4091/agents/agent%2Fid/c/conversation%20id/reports/",
        );
        expect(url.searchParams.get("buildingaiArtifactRoot")).toBe("artifacts/conversation id");
        expect(url.toString()).not.toContain("token");
    });

    it("prefers the browser-facing request origin and falls back to the configured web origin", () => {
        expect(
            resolveBuildingAIWebOrigin({
                origin: "http://127.0.0.1:4091",
                referer: "http://127.0.0.1:4091/agents/a/c/b",
                configuredWebOrigin: "http://localhost:4091",
            }),
        ).toBe("http://127.0.0.1:4091");
        expect(
            resolveBuildingAIWebOrigin({
                referer: "http://127.0.0.1:4091/agents/a/c/b?x=1",
                configuredWebOrigin: "http://localhost:4091",
            }),
        ).toBe("http://127.0.0.1:4091");
        expect(
            resolveBuildingAIWebOrigin({ configuredWebOrigin: "https://bowi.example/app" }),
        ).toBe("https://bowi.example");
    });
});
