import {
    extractOpencodePermissionAsk,
    shouldAbortStuckSession,
} from "./opencode-permission";

describe("extractOpencodePermissionAsk", () => {
    it("extracts permission.asked", () => {
        expect(
            extractOpencodePermissionAsk({
                type: "permission.asked",
                properties: {
                    id: "per_1",
                    sessionID: "ses_a",
                    permission: "read",
                    patterns: ["sap-connect/sap-abap/.env"],
                },
            }),
        ).toEqual({ requestId: "per_1", sessionId: "ses_a" });
    });

    it("extracts permission.v2.asked", () => {
        expect(
            extractOpencodePermissionAsk({
                type: "permission.v2.asked",
                properties: {
                    id: "per_2",
                    sessionID: "ses_b",
                    action: "read",
                    resources: ["../.env"],
                },
            }),
        ).toEqual({ requestId: "per_2", sessionId: "ses_b" });
    });

    it("ignores other events", () => {
        expect(
            extractOpencodePermissionAsk({
                type: "session.idle",
                properties: { sessionID: "ses_a" },
            }),
        ).toBeUndefined();
    });

    it("ignores asks missing ids", () => {
        expect(
            extractOpencodePermissionAsk({
                type: "permission.asked",
                properties: { sessionID: "ses_a" },
            }),
        ).toBeUndefined();
    });
});

describe("shouldAbortStuckSession", () => {
    it("does not abort a finish:null session that is only waiting for permission", () => {
        expect(shouldAbortStuckSession({ isStuck: true, pendingPermissionCount: 1 })).toBe(
            false,
        );
    });

    it("aborts a finish:null session with no pending permission", () => {
        expect(shouldAbortStuckSession({ isStuck: true, pendingPermissionCount: 0 })).toBe(
            true,
        );
    });

    it("does not abort a finished session", () => {
        expect(shouldAbortStuckSession({ isStuck: false, pendingPermissionCount: 0 })).toBe(
            false,
        );
    });
});
