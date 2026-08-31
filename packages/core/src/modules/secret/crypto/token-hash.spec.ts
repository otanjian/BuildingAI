import { hashInboundToken, matchesInboundToken } from "./token-hash";

describe("inbound token hashing", () => {
    it("matches the same token without persisting the token value", () => {
        const token = "browser-publish-token-2026";
        const hash = hashInboundToken(token);
        expect(hash).not.toContain(token);
        expect(matchesInboundToken(token, hash)).toBe(true);
        expect(matchesInboundToken("wrong-token", hash)).toBe(false);
    });

    it("fails closed when production hash configuration is missing", () => {
        const previousNodeEnv = process.env.NODE_ENV;
        const previousKey = process.env.BUILDINGAI_TOKEN_HASH_KEY;
        process.env.NODE_ENV = "production";
        delete process.env.BUILDINGAI_TOKEN_HASH_KEY;
        expect(() => hashInboundToken("token")).toThrow(/TOKEN_HASH_KEY/);
        process.env.NODE_ENV = previousNodeEnv;
        if (previousKey === undefined) delete process.env.BUILDINGAI_TOKEN_HASH_KEY;
        else process.env.BUILDINGAI_TOKEN_HASH_KEY = previousKey;
    });
});
