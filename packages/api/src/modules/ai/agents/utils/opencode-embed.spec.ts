import { buildOpencodeEmbedUrl, encodeOpencodeServerKey } from "./opencode-embed";

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
});
