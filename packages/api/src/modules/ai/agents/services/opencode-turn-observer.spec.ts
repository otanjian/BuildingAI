jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});

import {
    decideOpencodeTurnObservation,
    type OpencodeTurnObservation,
} from "./opencode-turn-observer";

const NOW = 10_000;

function observation(
    overrides: Partial<OpencodeTurnObservation> = {},
): OpencodeTurnObservation {
    return {
        localStatus: "running",
        remoteStatus: { type: "busy" },
        previousEvidence: {
            statusKey: "busy",
            sessionUpdatedAt: 100,
            messageFingerprint: "message-1",
            interactionFingerprint: "interaction-1",
        },
        currentEvidence: {
            statusKey: "busy",
            sessionUpdatedAt: 100,
            messageFingerprint: "message-1",
            interactionFingerprint: "interaction-1",
        },
        lastActivityAt: 9_500,
        now: NOW,
        inactivityTimeoutMs: 1_000,
        retryGraceMs: 100,
        finalEvidenceCheck: false,
        exactTerminalDescendantsVisible: false,
        exactDescendantErrorVisible: false,
        pendingPermissionIds: [],
        pendingQuestionIds: [],
        cancelRequested: false,
        ...overrides,
    };
}

describe("decideOpencodeTurnObservation", () => {
    it("keeps repeated busy evidence active without refreshing last activity", () => {
        expect(decideOpencodeTurnObservation(observation())).toEqual({
            kind: "continue",
            activityChanged: false,
        });
    });

    it.each([
        ["status", { statusKey: "retry:2:12000" }],
        ["session update", { sessionUpdatedAt: 101 }],
        ["message", { messageFingerprint: "message-2" }],
        ["interaction", { interactionFingerprint: "interaction-2" }],
    ])("refreshes activity only when %s evidence changes", (_case, currentEvidence) => {
        expect(
            decideOpencodeTurnObservation(
                observation({
                    currentEvidence: {
                        ...observation().currentEvidence,
                        ...currentEvidence,
                    },
                }),
            ),
        ).toEqual({ kind: "continue", activityChanged: true });
    });

    it("honors a provider retry deadline plus grace", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({
                    remoteStatus: {
                        type: "retry",
                        attempt: 2,
                        message: "rate limited",
                        next: NOW + 500,
                    },
                    lastActivityAt: 0,
                    finalEvidenceCheck: true,
                }),
            ),
        ).toEqual({
            kind: "continue",
            activityChanged: true,
            retryAfterMs: 600,
        });
    });

    it("requires one final evidence check before timing out stale busy", () => {
        const stale = observation({ lastActivityAt: 0 });
        expect(decideOpencodeTurnObservation(stale)).toEqual({
            kind: "final-check",
            activityChanged: false,
        });
        expect(
            decideOpencodeTurnObservation({ ...stale, finalEvidenceCheck: true }),
        ).toEqual({
            kind: "abort-stale",
            activityChanged: false,
            errorCode: "OPENCODE_INACTIVITY_TIMEOUT",
        });
    });

    it("moves idle into committing even when the exact message is not yet visible", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({ remoteStatus: { type: "idle" } }),
            ),
        ).toEqual({
            kind: "committing",
            activityChanged: true,
            terminalEvidence: false,
        });
    });

    it("settles only after an exact terminal descendant becomes visible", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({
                    localStatus: "committing",
                    remoteStatus: { type: "idle" },
                    exactTerminalDescendantsVisible: true,
                }),
            ),
        ).toEqual({
            kind: "settle",
            activityChanged: true,
            outcome: "completed",
        });
    });

    it("never commits blank when idle precedes message visibility", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({
                    localStatus: "committing",
                    remoteStatus: { type: "idle" },
                }),
            ),
        ).toEqual({
            kind: "continue",
            activityChanged: true,
            retryAfterMs: expect.any(Number),
        });
    });

    it("surfaces an exact descendant error as failed settlement", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({
                    localStatus: "committing",
                    remoteStatus: { type: "idle" },
                    exactDescendantErrorVisible: true,
                }),
            ),
        ).toEqual({
            kind: "settle",
            activityChanged: true,
            outcome: "failed",
            errorCode: "OPENCODE_REMOTE_MESSAGE_ERROR",
        });
    });

    it("handles permissions before other session actions", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({ pendingPermissionIds: ["per_1"] }),
            ),
        ).toEqual({
            kind: "reply-permission",
            activityChanged: true,
            requestId: "per_1",
        });
    });

    it("rejects questions deterministically", () => {
        expect(
            decideOpencodeTurnObservation(
                observation({ pendingQuestionIds: ["q_1"] }),
            ),
        ).toEqual({
            kind: "reject-question",
            activityChanged: true,
            requestId: "q_1",
            errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
        });
    });

    it("aborts a cancellation request but keeps the turn active until idle evidence", () => {
        expect(
            decideOpencodeTurnObservation(observation({ cancelRequested: true })),
        ).toEqual({ kind: "abort-cancelled", activityChanged: true });
        expect(
            decideOpencodeTurnObservation(
                observation({
                    cancelRequested: true,
                    remoteStatus: { type: "idle" },
                }),
            ),
        ).toEqual({
            kind: "committing",
            activityChanged: true,
            terminalEvidence: false,
            requestedOutcome: "cancelled",
        });
    });
});
