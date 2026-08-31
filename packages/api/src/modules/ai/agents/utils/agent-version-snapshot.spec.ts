import {
    buildAgentVersionDiff,
    createAgentVersionSnapshot,
    hashAgentVersionSnapshot,
    normalizeAgentVersionSnapshot,
    redactAgentVersionSnapshot,
} from "./agent-version-snapshot";

describe("agent version snapshots", () => {
    it("normalizes object keys deterministically without changing array order", () => {
        const left = { model: { temperature: 0.2, id: "m1" }, tools: ["z", "a"] };
        const right = { tools: ["z", "a"], model: { id: "m1", temperature: 0.2 } };

        expect(normalizeAgentVersionSnapshot(left)).toBe(normalizeAgentVersionSnapshot(right));
        expect(hashAgentVersionSnapshot(left)).toBe(hashAgentVersionSnapshot(right));
        expect(hashAgentVersionSnapshot(left)).toHaveLength(64);
    });

    it("redacts secrets recursively while preserving credential references", () => {
        const value = {
            model: { apiKey: "secret", credentialRef: "cred_123" },
            nested: [{ password: "pw" }, { token: "tok" }],
        };

        expect(redactAgentVersionSnapshot(value)).toEqual({
            model: { apiKey: "[REDACTED]", credentialRef: "cred_123" },
            nested: [{ password: "[REDACTED]" }, { token: "[REDACTED]" }],
        });
    });

    it("creates a redacted immutable snapshot with provenance and diff", () => {
        const snapshot = createAgentVersionSnapshot(
            { name: "Support", prompt: "hello", apiKey: "secret" },
            { createdBy: "user-1", releaseNote: "Initial version" },
        );
        const changed = { ...snapshot.snapshot, prompt: "hello world" };

        expect(snapshot.snapshot.apiKey).toBe("[REDACTED]");
        expect(snapshot.configHash).toBe(hashAgentVersionSnapshot(snapshot.snapshot));
        expect(snapshot.provenance).toMatchObject({ createdBy: "user-1", releaseNote: "Initial version" });
        expect(buildAgentVersionDiff(snapshot.snapshot, changed)).toEqual([
            { path: "prompt", before: "hello", after: "hello world", type: "changed" },
        ]);
    });
});
