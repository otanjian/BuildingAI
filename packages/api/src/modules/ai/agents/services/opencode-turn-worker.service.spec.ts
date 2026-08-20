jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("../integrations/opencode-api.service", () => ({
    OpencodeApiService: class OpencodeApiService {},
}));
jest.mock("./opencode-turn-mutation-coordinator", () => ({
    OpencodeTurnMutationCoordinator: class OpencodeTurnMutationCoordinator {},
}));
jest.mock("./opencode-artifact-baseline.service", () => ({
    OpencodeArtifactBaselineService: class OpencodeArtifactBaselineService {},
}));
jest.mock("./opencode-turn-terminal-commit", () => ({
    OpencodeTurnTerminalCommitService: class OpencodeTurnTerminalCommitService {},
}));
jest.mock("./opencode-turn.repository", () => ({
    OpencodeTurnRepository: class OpencodeTurnRepository {},
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const SERVICE_PATH = resolve(__dirname, "opencode-turn-worker.service.ts");
const TURN_ID = "11111111-1111-4111-8111-111111111111";
const LEASE_TOKEN = "22222222-2222-4222-8222-222222222222";

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(SERVICE_PATH)).toBe(true);
    if (!existsSync(SERVICE_PATH)) return undefined;
    return require(SERVICE_PATH) as Record<string, any>;
}

function turn(overrides: Record<string, unknown> = {}) {
    return {
        id: TURN_ID,
        conversationId: "33333333-3333-4333-8333-333333333333",
        status: "running",
        leaseToken: LEASE_TOKEN,
        leaseExpiresAt: new Date(Date.now() + 60_000),
        lastActivityAt: new Date(Date.now() - 100),
        cancelRequestedAt: null,
        errorCode: null,
        errorMessage: null,
        remoteEvidenceHash: null,
        opencodeUserMessageId: "msg_user",
        artifactBaseline: { version: 1, files: [] },
        dispatchSnapshot: { artifactRoot: "/workspace/artifacts/conversation" },
        conversation: {
            id: "33333333-3333-4333-8333-333333333333",
            agentId: "44444444-4444-4444-8444-444444444444",
            opencodeSessionId: "ses_1",
            agent: { thirdPartyIntegration: {}, sensitiveWordConfig: null },
        },
        ...overrides,
    };
}

function makeHarness(options: {
    turn?: Record<string, any>;
    remoteStatus?: Record<string, unknown>;
    exactUser?: Record<string, unknown> | null;
    messages?: Array<Record<string, unknown>>;
    permissions?: Array<Record<string, unknown>>;
    questions?: Array<Record<string, unknown>>;
} = {}) {
    const currentTurn = options.turn ?? turn();
    const manager = { findOne: jest.fn(async () => currentTurn) };
    const dataSource = {
        manager,
        transaction: jest.fn(async (callback: any) => callback(manager)),
    };
    const api = {
        getSessionStatus: jest.fn(async () => options.remoteStatus ?? { type: "busy" }),
        getSessionUpdatedAt: jest.fn(async () => 100),
        getExactSessionMessage: jest.fn(async () => options.exactUser ?? {
            info: { id: "msg_user", role: "user" },
            parts: [],
        }),
        listRecentSessionMessages: jest.fn(async () => options.messages ?? []),
        listPendingPermissions: jest.fn(async () => options.permissions ?? []),
        listPendingQuestions: jest.fn(async () => options.questions ?? []),
    };
    const mutations = {
        dispatch: jest.fn(async () => ({ kind: "dispatched", sessionId: "ses_1" })),
        replyPermission: jest.fn(async () => true),
        rejectQuestion: jest.fn(async () => true),
        abort: jest.fn(async () => undefined),
    };
    const baselines = {
        changedHtmlFiles: jest.fn(async () => []),
    };
    const commits = { commit: jest.fn(async (input: any) => input) };
    const turns = {
        transition: jest.fn(async (_manager: any, input: any) => {
            currentTurn.status = input.to;
            return { changed: true, turn: currentTurn };
        }),
        recordActiveEvidence: jest.fn(async (_manager: any, input: any) => {
            Object.assign(currentTurn, {
                lastActivityAt: input.lastActivityAt,
                remoteEvidenceHash: input.remoteEvidenceHash,
                errorCode: input.errorCode,
                errorMessage: input.errorMessage,
            });
            return currentTurn;
        }),
    };
    const telemetry = { observe: jest.fn() };
    return { currentTurn, manager, dataSource, api, mutations, baselines, commits, turns, telemetry };
}

function createService(module: Record<string, any>, harness: ReturnType<typeof makeHarness>) {
    return new module.OpencodeTurnWorkerService(
        harness.dataSource,
        harness.api,
        harness.mutations,
        harness.baselines,
        harness.commits,
        harness.turns,
        harness.telemetry,
    );
}

describe("OpencodeTurnWorkerService", () => {
    it("dispatches an accepted turn through the mutation coordinator", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ turn: turn({ status: "accepted" }) });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "dispatched" });
        expect(harness.mutations.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        );
    });

    it("settles an accepted pre-dispatch cancellation without creating a session or prompt", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn({
                status: "accepted",
                startedAt: null,
                artifactBaseline: null,
                cancelRequestedAt: new Date(),
            }),
        });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "settled" });
        expect(harness.mutations.dispatch).not.toHaveBeenCalled();
        expect(harness.mutations.abort).not.toHaveBeenCalled();
        expect(harness.commits.commit).toHaveBeenCalledWith(
            expect.objectContaining({ outcome: "cancelled" }),
        );
    });

    it("keeps a running cancellation active when the remote abort is ambiguous", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ turn: turn({ cancelRequestedAt: new Date() }) });
        harness.mutations.abort.mockRejectedValue(new Error("abort response lost"));

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).rejects.toThrow("abort response lost");
        expect(harness.currentTurn.status).toBe("running");
        expect(harness.commits.commit).not.toHaveBeenCalled();
    });

    it("does not update activity for unchanged busy evidence", async () => {
        const module = loadModule();
        if (!module) return;
        const evidence = JSON.stringify({
            statusKey: "busy",
            sessionUpdatedAt: 100,
            messageFingerprint: "msg_user",
            interactionFingerprint: "",
        });
        const harness = makeHarness({
            turn: turn({
                remoteEvidenceHash: createHash("sha256").update(evidence).digest("hex"),
            }),
        });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "continue", activityChanged: false });
        expect(harness.turns.recordActiveEvidence).not.toHaveBeenCalled();
        expect(harness.telemetry.observe).toHaveBeenCalledWith(
            "status_latency_ms",
            expect.any(Number),
            expect.objectContaining({ turnId: TURN_ID, outcome: "busy" }),
        );
    });

    it("preserves a question failure intent when later remote evidence changes", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn({
                errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
                errorMessage: "OpenCode interactive questions are unsupported",
                remoteEvidenceHash: "previous-evidence",
            }),
        });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "continue", activityChanged: true });
        expect(harness.turns.recordActiveEvidence).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({
                errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
                errorMessage: "OpenCode interactive questions are unsupported",
            }),
        );
    });

    it("moves idle into committing and does not commit before exact descendants appear", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ remoteStatus: { type: "idle" }, messages: [] });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "committing" });
        expect(harness.turns.transition).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({ to: "committing" }),
        );
        expect(harness.commits.commit).not.toHaveBeenCalled();
    });

    it.each([
        [
            "cancelled",
            { cancelRequestedAt: new Date(), status: "committing" },
            "cancelled",
        ],
        [
            "unsupported question",
            {
                status: "committing",
                errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
                errorMessage: "Interactive questions are unsupported",
            },
            "failed",
        ],
        [
            "timeout",
            {
                status: "committing",
                errorCode: "OPENCODE_INACTIVITY_TIMEOUT",
                errorMessage: "OpenCode turn timed out",
            },
            "failed",
        ],
    ])("settles an idle %s intent without requiring a remote assistant", async (_case, intent, outcome) => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn(intent),
            remoteStatus: { type: "idle" },
            messages: [],
        });

        await createService(module, harness).runStep({
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
        });
        expect(harness.commits.commit).toHaveBeenCalledWith(
            expect.objectContaining({
                outcome,
                parts: [expect.objectContaining({ type: "text", text: expect.any(String) })],
            }),
        );
    });

    it("commits exact completed descendants with changed artifacts", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn({ status: "committing" }),
            remoteStatus: { type: "idle" },
            messages: [
                {
                    info: {
                        id: "msg_assistant",
                        role: "assistant",
                        parentID: "msg_user",
                        finish: "stop",
                        tokens: {
                            input: 1,
                            output: 1,
                            reasoning: 0,
                            cache: { read: 0, write: 0 },
                        },
                    },
                    parts: [{ id: "part", type: "text", text: "done" }],
                },
            ],
        });
        harness.baselines.changedHtmlFiles.mockResolvedValue(["report.html"]);

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "settled" });
        expect(harness.commits.commit).toHaveBeenCalledWith(
            expect.objectContaining({
                turnId: TURN_ID,
                outcome: "completed",
                parts: [{ type: "text", text: "done" }],
                artifacts: [expect.objectContaining({ relativePath: "report.html" })],
            }),
        );
    });

    it("persists the committing boundary before projecting a terminal descendant", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn({ status: "running" }),
            remoteStatus: { type: "idle" },
            messages: [
                {
                    info: {
                        id: "msg_assistant",
                        role: "assistant",
                        parentID: "msg_user",
                        finish: "stop",
                    },
                    parts: [{ id: "part", type: "text", text: "done" }],
                },
            ],
        });

        await expect(
            createService(module, harness).runStep({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).resolves.toMatchObject({ action: "committing" });
        expect(harness.turns.transition).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({ to: "committing" }),
        );
        expect(harness.commits.commit).not.toHaveBeenCalled();
    });

    it.each([
        ["cancelled", { cancelRequestedAt: new Date() }, "cancelled"],
        [
            "failed question",
            {
                errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
                errorMessage: "Interactive questions are unsupported",
            },
            "failed",
        ],
    ])("preserves the %s terminal intent when remote settlement appears", async (_case, intent, outcome) => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            turn: turn({ status: "committing", ...intent }),
            remoteStatus: { type: "idle" },
            messages: [
                {
                    info: {
                        id: "msg_assistant",
                        role: "assistant",
                        parentID: "msg_user",
                        finish: "stop",
                        tokens: {
                            input: 4,
                            output: 1,
                            reasoning: 0,
                            cache: { read: 0, write: 0 },
                        },
                    },
                    parts: [{ id: "part", type: "text", text: "partial result" }],
                },
            ],
        });

        await createService(module, harness).runStep({
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
        });
        expect(harness.commits.commit).toHaveBeenCalledWith(
            expect.objectContaining({ outcome, usage: expect.objectContaining({ totalTokens: 5 }) }),
        );
    });

    it("handles exact permission and question requests as one mutation per step", async () => {
        const module = loadModule();
        if (!module) return;
        const permission = makeHarness({ permissions: [{ id: "per_1", sessionID: "ses_1" }] });
        await createService(module, permission).runStep({
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
        });
        expect(permission.mutations.replyPermission).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: "per_1" }),
        );

        const question = makeHarness({ questions: [{ id: "q_1", sessionID: "ses_1" }] });
        await createService(module, question).runStep({
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
        });
        expect(question.mutations.rejectQuestion).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: "q_1" }),
        );
        expect(question.mutations.abort).toHaveBeenCalledTimes(1);
    });

    it("does not repeat an exact permission mutation after its evidence was recorded", async () => {
        const module = loadModule();
        if (!module) return;
        const evidence = JSON.stringify({
            statusKey: "busy",
            sessionUpdatedAt: 100,
            messageFingerprint: "msg_user",
            interactionFingerprint: "permission:per_1",
        });
        const harness = makeHarness({
            turn: turn({ remoteEvidenceHash: createHash("sha256").update(evidence).digest("hex") }),
            permissions: [{ id: "per_1", sessionID: "ses_1" }],
        });

        await expect(
            createService(module, harness).runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "continue", activityChanged: false });
        expect(harness.mutations.replyPermission).not.toHaveBeenCalled();
    });

    it("records one visible failed outcome after rejecting an exact question", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        harness.api.listPendingQuestions
            .mockResolvedValueOnce([{ id: "q_1", sessionID: "ses_1" }])
            .mockResolvedValueOnce([]);
        harness.api.getSessionStatus
            .mockResolvedValueOnce({ type: "busy" })
            .mockResolvedValueOnce({ type: "idle" });

        const service = createService(module, harness);
        await expect(
            service.runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "reject-question" });
        await expect(
            service.runStep({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ action: "settled" });

        expect(harness.mutations.rejectQuestion).toHaveBeenCalledTimes(1);
        expect(harness.commits.commit).toHaveBeenCalledTimes(1);
        expect(harness.commits.commit).toHaveBeenCalledWith(
            expect.objectContaining({
                outcome: "failed",
                errorCode: "OPENCODE_INTERACTIVE_QUESTION_UNSUPPORTED",
            }),
        );
    });

    it("aborts stale busy only after a final evidence check", async () => {
        const module = loadModule();
        if (!module) return;
        const stale = turn({
            lastActivityAt: new Date(Date.now() - 120_000),
            errorCode: "OPENCODE_FINAL_EVIDENCE_CHECK",
            remoteEvidenceHash: createHash("sha256")
                .update(
                    JSON.stringify({
                        statusKey: "busy",
                        sessionUpdatedAt: 100,
                        messageFingerprint: "msg_user",
                        interactionFingerprint: "",
                    }),
                )
                .digest("hex"),
        });
        const harness = makeHarness({ turn: stale });

        await expect(
            createService(module, harness).runStep({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                inactivityTimeoutMs: 60_000,
            }),
        ).resolves.toMatchObject({ action: "abort-stale" });
        expect(harness.mutations.abort).toHaveBeenCalledTimes(1);
    });
});
