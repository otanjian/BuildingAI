import type {
    OpencodeSessionStatus,
} from "../integrations/opencode-api.service";

export type OpencodeTurnEvidence = {
    statusKey: string;
    sessionUpdatedAt: number | null;
    messageFingerprint: string | null;
    interactionFingerprint: string | null;
};

export type OpencodeTurnObservation = {
    localStatus: "accepted" | "running" | "committing";
    remoteStatus: OpencodeSessionStatus;
    previousEvidence: OpencodeTurnEvidence | null;
    currentEvidence: OpencodeTurnEvidence;
    lastActivityAt: number;
    now: number;
    inactivityTimeoutMs: number;
    retryGraceMs: number;
    finalEvidenceCheck: boolean;
    exactTerminalDescendantsVisible: boolean;
    exactDescendantErrorVisible: boolean;
    pendingPermissionIds: string[];
    pendingQuestionIds: string[];
    cancelRequested: boolean;
};

export type OpencodeTurnObservationDecision =
    | { kind: "continue"; activityChanged: boolean; retryAfterMs?: number }
    | { kind: "final-check"; activityChanged: boolean }
    | { kind: "abort-stale"; activityChanged: boolean; errorCode: string }
    | {
          kind: "committing";
          activityChanged: boolean;
          terminalEvidence: boolean;
          requestedOutcome?: "cancelled";
      }
    | {
          kind: "settle";
          activityChanged: boolean;
          outcome: "completed" | "failed";
          errorCode?: string;
      }
    | { kind: "reply-permission"; activityChanged: boolean; requestId: string }
    | {
          kind: "reject-question";
          activityChanged: boolean;
          requestId: string;
          errorCode: string;
      }
    | { kind: "abort-cancelled"; activityChanged: boolean };

const DEFAULT_SETTLE_RETRY_MS = 250;

export function decideOpencodeTurnObservation(
    input: OpencodeTurnObservation,
): OpencodeTurnObservationDecision {
    const activityChanged = evidenceChanged(input.previousEvidence, input.currentEvidence);

    const permissionId = input.pendingPermissionIds[0];
    if (permissionId && activityChanged) {
        return { kind: "reply-permission", activityChanged: true, requestId: permissionId };
    }

    const questionId = input.pendingQuestionIds[0];
    if (questionId && activityChanged) {
        return {
            kind: "reject-question",
            activityChanged: true,
            requestId: questionId,
            errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
        };
    }

    if (input.remoteStatus.type === "idle") {
        if (input.exactDescendantErrorVisible) {
            return {
                kind: "settle",
                activityChanged,
                outcome: "failed",
                errorCode: "OPENCODE_REMOTE_MESSAGE_ERROR",
            };
        }
        if (input.exactTerminalDescendantsVisible) {
            return {
                kind: "settle",
                activityChanged,
                outcome: "completed",
            };
        }
        if (input.localStatus !== "committing") {
            return {
                kind: "committing",
                activityChanged,
                terminalEvidence: false,
                ...(input.cancelRequested ? { requestedOutcome: "cancelled" as const } : {}),
            };
        }
        return {
            kind: "continue",
            activityChanged,
            retryAfterMs: DEFAULT_SETTLE_RETRY_MS,
        };
    }

    if (input.cancelRequested) {
        return { kind: "abort-cancelled", activityChanged: true };
    }

    if (input.remoteStatus.type === "retry") {
        const validUntil = input.remoteStatus.next + input.retryGraceMs;
        if (input.now < validUntil) {
            return {
                kind: "continue",
                activityChanged: true,
                retryAfterMs: validUntil - input.now,
            };
        }
    }

    const stale = input.now - input.lastActivityAt >= input.inactivityTimeoutMs;
    if (stale && !activityChanged) {
        if (!input.finalEvidenceCheck) {
            return { kind: "final-check", activityChanged: false };
        }
        return {
            kind: "abort-stale",
            activityChanged: false,
            errorCode: "OPENCODE_INACTIVITY_TIMEOUT",
        };
    }

    return { kind: "continue", activityChanged };
}

function evidenceChanged(
    previous: OpencodeTurnEvidence | null,
    current: OpencodeTurnEvidence,
): boolean {
    if (!previous) return true;
    return (
        previous.statusKey !== current.statusKey ||
        previous.sessionUpdatedAt !== current.sessionUpdatedAt ||
        previous.messageFingerprint !== current.messageFingerprint ||
        previous.interactionFingerprint !== current.interactionFingerprint
    );
}
