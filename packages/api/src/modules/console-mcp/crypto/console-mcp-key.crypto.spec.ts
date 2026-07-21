import {
    generateConsoleMcpApiKey,
    hashConsoleMcpApiKey,
    prefixConsoleMcpApiKey,
} from "./console-mcp-key.crypto";

describe("console-mcp-key.crypto", () => {
    it("generates a bcmk_ prefixed secret", () => {
        const secret = generateConsoleMcpApiKey();
        expect(secret.startsWith("bcmk_")).toBe(true);
        expect(secret.length).toBeGreaterThan(20);
    });

    it("hashes deterministically and differently from the raw secret", () => {
        const secret = generateConsoleMcpApiKey();
        const hash = hashConsoleMcpApiKey(secret);
        expect(hash).toHaveLength(64);
        expect(hash).not.toEqual(secret);
        expect(hashConsoleMcpApiKey(secret)).toEqual(hash);
    });

    it("exposes a stable display prefix without the full secret", () => {
        const secret = "bcmk_abcdefghijklmnopqrstuvwxyz012345";
        const prefix = prefixConsoleMcpApiKey(secret);
        expect(prefix).toBe("bcmk_abcdefg");
        expect(secret.startsWith(prefix)).toBe(true);
        expect(prefix.length).toBeLessThan(secret.length);
    });
});
