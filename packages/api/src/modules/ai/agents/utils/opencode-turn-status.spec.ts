import {
    isOpencodeTurnRunning,
    mergeOpencodeTurnMetadata,
    type OpencodeTurnStatus,
    readOpencodeTurnStatus,
} from "./opencode-turn-status";

describe("readOpencodeTurnStatus", () => {
    it("reads status from metadata", () => {
        expect(readOpencodeTurnStatus({ opencodeTurnStatus: "running" })).toBe("running");
        expect(readOpencodeTurnStatus({ opencodeTurnStatus: "timed_out" })).toBe("timed_out");
        expect(readOpencodeTurnStatus({ opencodeTurnStatus: "persist_failed" })).toBe("persist_failed");
        expect(readOpencodeTurnStatus(undefined)).toBeUndefined();
        expect(readOpencodeTurnStatus({ opencodeTurnStatus: "nope" })).toBeUndefined();
    });
});

describe("isOpencodeTurnRunning", () => {
    it("is true only for running", () => {
        expect(isOpencodeTurnRunning({ opencodeTurnStatus: "running" })).toBe(true);
        expect(isOpencodeTurnRunning({ opencodeTurnStatus: "completed" })).toBe(false);
        expect(isOpencodeTurnRunning(undefined)).toBe(false);
    });
});

describe("mergeOpencodeTurnMetadata", () => {
    it("sets running with startedAt and clears endedAt", () => {
        const next = mergeOpencodeTurnMetadata(
            { provider: "opencode", opencodeTurnStatus: "completed", opencodeTurnEndedAt: "x" },
            { status: "running", at: "2026-08-15T12:00:00.000Z" },
        );
        expect(next.opencodeTurnStatus).toBe("running" satisfies OpencodeTurnStatus);
        expect(next.opencodeTurnStartedAt).toBe("2026-08-15T12:00:00.000Z");
        expect(next.opencodeTurnEndedAt).toBeUndefined();
        expect(next.provider).toBe("opencode");
    });

    it("sets terminal status with endedAt", () => {
        const next = mergeOpencodeTurnMetadata(
            { opencodeTurnStatus: "running", opencodeTurnStartedAt: "a" },
            { status: "timed_out", at: "2026-08-15T12:15:00.000Z" },
        );
        expect(next.opencodeTurnStatus).toBe("timed_out");
        expect(next.opencodeTurnEndedAt).toBe("2026-08-15T12:15:00.000Z");
        expect(next.opencodeTurnStartedAt).toBe("a");
    });

    it("sets persistence failure as a terminal status", () => {
        const next = mergeOpencodeTurnMetadata(
            { opencodeTurnStatus: "running" },
            { status: "persist_failed", at: "2026-08-15T12:16:00.000Z" },
        );

        expect(next.opencodeTurnStatus).toBe("persist_failed");
        expect(next.opencodeTurnEndedAt).toBe("2026-08-15T12:16:00.000Z");
    });
});
