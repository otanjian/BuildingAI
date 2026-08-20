jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("./agents.service", () => ({ AgentsService: class AgentsService {} }));
jest.mock("../integrations/opencode-api.service", () => ({
    OpencodeApiError: class OpencodeApiError extends Error {},
    OpencodeApiService: class OpencodeApiService {},
}));
jest.mock("../utils/opencode-turn-command", () => ({
    hashOpencodeRuntime: () => "runtime-hash",
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_PATH = resolve(__dirname, "opencode-turn-mutation-coordinator.ts");
const TURN_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const LEASE_TOKEN = "33333333-3333-4333-8333-333333333333";
const REMOTE_MESSAGE_ID = "msg_stable_123";

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(SERVICE_PATH)).toBe(true);
    if (!existsSync(SERVICE_PATH)) return undefined;
    return require(SERVICE_PATH) as Record<string, any>;
}

function makeHarness(
    overrides: {
        status?: "accepted" | "running" | "committing";
        sessionId?: string | null;
        runtimeHash?: string | null;
        turnRuntimeHash?: string;
        remoteMessage?: Record<string, unknown> | null;
        startedAt?: Date | null;
        priorTurns?: number;
        pendingPermissions?: Array<{ id: string; sessionID: string }>;
        pendingQuestions?: Array<{ id: string; sessionID: string; questions: [] }>;
        leaseExpiresAt?: Date;
    } = {},
) {
    const runtimeHash = overrides.runtimeHash === undefined ? "runtime-hash" : overrides.runtimeHash;
    const conversation = {
        id: CONVERSATION_ID,
        agentId: "44444444-4444-4444-8444-444444444444",
        opencodeSessionId: overrides.sessionId === undefined ? null : overrides.sessionId,
        opencodeRuntimeHash: runtimeHash && overrides.sessionId ? runtimeHash : null,
    };
    const turn = {
        id: TURN_ID,
        conversationId: CONVERSATION_ID,
        conversation,
        status: overrides.status ?? "accepted",
        leaseToken: LEASE_TOKEN,
        leaseExpiresAt: overrides.leaseExpiresAt ?? new Date(Date.now() + 60_000),
        runtimeConfigHash: overrides.turnRuntimeHash ?? "runtime-hash",
        artifactBaseline: overrides.status === "accepted" || !overrides.status ? null : { files: [] },
        dispatchSnapshot: {
            promptParts: [{ type: "text", text: "hello" }],
            system: "system",
            artifactRoot: "/workspace/artifacts/conversation",
            billing: { enabled: false, power: 0, tokens: 1000 },
            isDebug: false,
            formVariables: {},
            formFieldsInputs: {},
        },
        opencodeUserMessageId: REMOTE_MESSAGE_ID,
        startedAt: overrides.startedAt ?? null,
        cancelRequestedAt: null,
    };
    const manager = {
        findOne: jest.fn(async (target: any) => {
            if (target?.name === "AgentOpencodeTurn") return turn;
            if (target?.name === "AgentChatRecord") return conversation;
            return null;
        }),
        count: jest.fn(async () => overrides.priorTurns ?? 0),
        save: jest.fn(async (_target: any, entity: any) => entity),
    };
    const queryRunner = {
        manager,
        connect: jest.fn(async () => undefined),
        query: jest.fn(async (sql: string) =>
            sql.includes("pg_advisory_unlock") ? [{ unlocked: true }] : [],
        ),
        startTransaction: jest.fn(async () => undefined),
        commitTransaction: jest.fn(async () => undefined),
        rollbackTransaction: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
    };
    const dataSource = {
        getRepository: jest.fn(() => ({ findOne: jest.fn(async () => turn) })),
        createQueryRunner: jest.fn(() => queryRunner),
    };
    const agentsService = {
        getAgentByIdOrThrow: jest.fn(async () => ({
            id: conversation.agentId,
            createMode: "opencode",
            thirdPartyIntegration: { provider: "opencode", baseURL: "http://opencode.test" },
        })),
    };
    const api = {
        normalizeConfig: jest.fn(() => ({
            baseURL: "http://opencode.test",
            workspace: "/workspace",
        })),
        createSession: jest.fn(async () => ({ id: "ses_created" })),
        getSessionUpdatedAt: jest.fn(async () => 100),
        getExactSessionMessage: jest.fn(async () => overrides.remoteMessage ?? null),
        promptAsync: jest.fn(async () => undefined),
        listPendingPermissions: jest.fn(async () => overrides.pendingPermissions ?? []),
        replyPermission: jest.fn(async () => undefined),
        listPendingQuestions: jest.fn(async () => overrides.pendingQuestions ?? []),
        rejectQuestion: jest.fn(async () => undefined),
        abortSession: jest.fn(async () => undefined),
    };
    const baseline = {
        capture: jest.fn(async () => ({ version: 1, files: [] })),
    };
    const turnRepository = {
        transition: jest.fn(async (_manager: any, input: any) => {
            Object.assign(turn, input.patch, { status: input.to });
            return { changed: true, turn };
        }),
    };
    const telemetry = { increment: jest.fn() };
    return {
        turn,
        conversation,
        manager,
        queryRunner,
        dataSource,
        agentsService,
        api,
        baseline,
        turnRepository,
        telemetry,
    };
}

function createService(module: Record<string, any>, harness: ReturnType<typeof makeHarness>) {
    return new module.OpencodeTurnMutationCoordinator(
        harness.dataSource,
        harness.agentsService,
        harness.api,
        harness.baseline,
        harness.turnRepository,
        harness.telemetry,
    );
}

describe("OpencodeTurnMutationCoordinator", () => {
    it("persists the baseline before first dispatch and uses the stable remote ID", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ sessionId: "ses_existing" });
        const service = createService(module, harness);

        await expect(
            service.dispatch({ turnId: TURN_ID, leaseToken: LEASE_TOKEN }),
        ).resolves.toMatchObject({ kind: "dispatched", sessionId: "ses_existing" });

        expect(harness.queryRunner.query).toHaveBeenNthCalledWith(
            1,
            "SELECT pg_advisory_lock(hashtextextended($1, 0))",
            [`opencode-conversation:${CONVERSATION_ID}`],
        );
        expect(harness.baseline.capture).toHaveBeenCalledWith(
            "/workspace/artifacts/conversation",
        );
        expect(harness.api.createSession).not.toHaveBeenCalled();
        expect(harness.api.promptAsync).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: "ses_existing",
                messageId: REMOTE_MESSAGE_ID,
                parts: [{ type: "text", text: "hello" }],
            }),
        );
        expect(harness.queryRunner.commitTransaction.mock.invocationCallOrder.at(-1)).toBeLessThan(
            harness.api.promptAsync.mock.invocationCallOrder[0],
        );
    });

    it("creates and persists a first session as one remote mutation before dispatch", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).resolves.toEqual({ kind: "session-created", sessionId: "ses_created" });
        expect(harness.conversation).toMatchObject({
            opencodeSessionId: "ses_created",
            opencodeRuntimeHash: "runtime-hash",
        });
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it("observes an existing stable remote message without redispatch", async () => {
        const module = loadModule();
        if (!module) return;
        const remoteMessage = { info: { id: REMOTE_MESSAGE_ID, role: "user" }, parts: [] };
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            remoteMessage,
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).resolves.toEqual({ kind: "observing", sessionId: "ses_existing", message: remoteMessage });
        expect(harness.api.createSession).not.toHaveBeenCalled();
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it("recovers a lost prompt response from the exact stable remote ID", async () => {
        const module = loadModule();
        if (!module) return;
        const remoteMessage = { info: { id: REMOTE_MESSAGE_ID, role: "user" }, parts: [] };
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            remoteMessage,
            startedAt: new Date(Date.now() - 60_000),
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).resolves.toMatchObject({ kind: "observing", message: remoteMessage });
        expect(harness.telemetry.increment).toHaveBeenCalledWith(
            "recovery_claim",
            expect.objectContaining({ recovery: "correlated-remote-message", turnId: TURN_ID }),
        );
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it("dispatches an absent stable ID after the ambiguity window without recapturing baseline", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            startedAt: new Date(Date.now() - 60_000),
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                ambiguityWindowMs: 5_000,
            }),
        ).resolves.toMatchObject({ kind: "dispatched" });
        expect(harness.baseline.capture).not.toHaveBeenCalled();
        expect(harness.api.promptAsync).toHaveBeenCalledTimes(1);
    });

    it("waits through an ambiguity window before retrying an absent remote ID", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            startedAt: new Date(Date.now() - 100),
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                ambiguityWindowMs: 10_000,
            }),
        ).resolves.toMatchObject({ kind: "waiting", sessionId: "ses_existing" });
        expect(harness.telemetry.increment).toHaveBeenCalledWith(
            "dispatch_ambiguity",
            expect.objectContaining({ turnId: TURN_ID, ambiguityAgeMs: expect.any(Number) }),
        );
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it.each([
        ["runtime mismatch", { turnRuntimeHash: "different" }],
        ["stale lease", {}],
    ])("fences %s before any remote mutation", async (caseName, overrides) => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness(overrides as any);
        const token = caseName === "stale lease" ? "55555555-5555-4555-8555-555555555555" : LEASE_TOKEN;

        await expect(
            createService(module, harness).dispatch({ turnId: TURN_ID, leaseToken: token }),
        ).rejects.toThrow(/runtime|lease/i);
        expect(harness.api.createSession).not.toHaveBeenCalled();
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it("does not replace a lost mapped session after prior local turns", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ priorTurns: 1 });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).rejects.toThrow(/session.*lost/i);
        expect(harness.api.createSession).not.toHaveBeenCalled();
    });

    it("fails a missing mapped remote session without redispatching into it", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ status: "running", sessionId: "ses_missing" });
        harness.api.getSessionUpdatedAt.mockRejectedValue({
            kind: "not_found",
            message: "not found",
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).rejects.toThrow(/session.*lost/i);
        expect(harness.api.getExactSessionMessage).not.toHaveBeenCalled();
        expect(harness.api.promptAsync).not.toHaveBeenCalled();
    });

    it("requires every remote operation deadline to fit inside the remaining lease", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            leaseExpiresAt: new Date(Date.now() + 100),
        });

        await expect(
            createService(module, harness).dispatch({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                mutationTimeoutMs: 5_000,
            }),
        ).rejects.toThrow(/deadline.*lease/i);
        expect(harness.api.getSessionUpdatedAt).not.toHaveBeenCalled();
    });

    it("revalidates the claim and exact session before permission/question/abort mutations", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            pendingPermissions: [{ id: "per_1", sessionID: "ses_existing" }],
            pendingQuestions: [{ id: "q_1", sessionID: "ses_existing", questions: [] }],
        });
        const service = createService(module, harness);

        await expect(
            service.replyPermission({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                requestId: "per_1",
            }),
        ).resolves.toBe(true);
        await expect(
            service.rejectQuestion({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                requestId: "q_1",
            }),
        ).resolves.toBe(true);
        await service.abort({ turnId: TURN_ID, leaseToken: LEASE_TOKEN });

        expect(harness.api.replyPermission).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: "per_1" }),
        );
        expect(harness.api.rejectQuestion).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: "q_1" }),
        );
        expect(harness.api.abortSession).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: "ses_existing" }),
        );
        expect(harness.queryRunner.query).toHaveBeenCalledTimes(6);
    });

    it("revalidates a lease that expires while discovering a pending permission", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({
            status: "running",
            sessionId: "ses_existing",
            pendingPermissions: [{ id: "per_1", sessionID: "ses_existing" }],
        });
        harness.api.listPendingPermissions.mockImplementation(async () => {
            harness.turn.leaseToken = "55555555-5555-4555-8555-555555555555";
            return [{ id: "per_1", sessionID: "ses_existing" }];
        });

        await expect(
            createService(module, harness).replyPermission({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                requestId: "per_1",
            }),
        ).rejects.toThrow(/lease/i);
        expect(harness.api.replyPermission).not.toHaveBeenCalled();
    });

    it("fences a delayed old-turn mutation after a newer claim owns the conversation", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ status: "running", sessionId: "ses_existing" });
        harness.manager.findOne.mockResolvedValue(null);

        await expect(
            createService(module, harness).abort({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).rejects.toThrow(/lease/i);
        expect(harness.api.getSessionUpdatedAt).not.toHaveBeenCalled();
        expect(harness.api.abortSession).not.toHaveBeenCalled();
    });

    it("revalidates abort after the mapped-session existence read", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ status: "running", sessionId: "ses_existing" });
        harness.api.getSessionUpdatedAt.mockImplementation(async () => {
            harness.turn.leaseToken = "55555555-5555-4555-8555-555555555555";
            return 100;
        });

        await expect(
            createService(module, harness).abort({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
            }),
        ).rejects.toThrow(/lease/i);
        expect(harness.api.abortSession).not.toHaveBeenCalled();
    });
});
