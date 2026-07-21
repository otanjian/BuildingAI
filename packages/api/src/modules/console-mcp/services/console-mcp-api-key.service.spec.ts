import {
    generateConsoleMcpApiKey,
    hashConsoleMcpApiKey,
    prefixConsoleMcpApiKey,
} from "../crypto/console-mcp-key.crypto";

/**
 * Lightweight create → hash auth → revoke semantics without Nest DI.
 * Mirrors ConsoleMcpApiKeyService behavior for unit coverage.
 */
describe("console mcp api key auth flow (unit)", () => {
    type KeyRow = {
        id: string;
        userId: string;
        label: string;
        keyHash: string;
        keyPrefix: string;
        revokedAt: Date | null;
        lastUsedAt: Date | null;
    };

    const store = new Map<string, KeyRow>();

    function create(userId: string, label: string) {
        const secret = generateConsoleMcpApiKey();
        const id = `key-${store.size + 1}`;
        const row: KeyRow = {
            id,
            userId,
            label,
            keyHash: hashConsoleMcpApiKey(secret),
            keyPrefix: prefixConsoleMcpApiKey(secret),
            revokedAt: null,
            lastUsedAt: null,
        };
        store.set(id, row);
        return { ...row, secret };
    }

    function authenticate(rawKey: string): KeyRow {
        const keyHash = hashConsoleMcpApiKey(rawKey);
        const row = [...store.values()].find((k) => k.keyHash === keyHash && !k.revokedAt);
        if (!row) {
            throw new Error("unauthorized");
        }
        row.lastUsedAt = new Date();
        return row;
    }

    function revoke(keyId: string) {
        const row = store.get(keyId);
        if (!row) throw new Error("not found");
        row.revokedAt = new Date();
    }

    beforeEach(() => {
        store.clear();
    });

    it("create → authenticate by hash succeeds; list never exposes secret or hash", () => {
        const created = create("user-1", "cursor");
        expect(created.secret).toBeDefined();
        expect(created.keyHash).not.toEqual(created.secret);

        const auth = authenticate(created.secret);
        expect(auth.id).toBe(created.id);
        expect(auth.lastUsedAt).toBeInstanceOf(Date);

        const listed = [...store.values()].map(({ id, label, keyPrefix, revokedAt, lastUsedAt }) => ({
            id,
            label,
            keyPrefix,
            revokedAt,
            lastUsedAt,
        }));
        expect(listed[0]).not.toHaveProperty("secret");
        expect(listed[0]).not.toHaveProperty("keyHash");
        expect(JSON.stringify(listed)).not.toContain(created.secret);
    });

    it("revoke rejects subsequent authenticate", () => {
        const created = create("user-1", "cursor");
        revoke(created.id);
        expect(() => authenticate(created.secret)).toThrow("unauthorized");
    });
});
