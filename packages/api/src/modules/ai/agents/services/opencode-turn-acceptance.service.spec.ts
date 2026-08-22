jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return {
        __esModule: true,
        default: new Proxy(color, { get: () => color }),
    };
});
jest.mock("@buildingai/dict", () => ({
    UserDictService: class UserDictService {},
}));
jest.mock(
    "@modules/config/services/agent-config.service",
    () => ({ AgentConfigService: class AgentConfigService {} }),
    { virtual: true },
);
jest.mock("./agents.service", () => ({ AgentsService: class AgentsService {} }));
jest.mock("../handlers/agent-billing", () => ({
    AgentBillingHandler: class AgentBillingHandler {},
}));
jest.mock("../integrations/opencode-api.service", () => ({
    OpencodeApiService: class OpencodeApiService {},
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_PATH = resolve(__dirname, "opencode-turn-acceptance.service.ts");
const TURN_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const AGENT_ID = "33333333-3333-4333-8333-333333333333";
const USER_ID = "44444444-4444-4444-8444-444444444444";

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(SERVICE_PATH)).toBe(true);
    if (!existsSync(SERVICE_PATH)) return undefined;
    return require(SERVICE_PATH) as Record<string, any>;
}

function input(overrides: Record<string, unknown> = {}) {
    return {
        turnId: TURN_ID,
        conversationId: CONVERSATION_ID,
        agentId: AGENT_ID,
        userId: USER_ID,
        message: { role: "user", parts: [{ type: "text", text: "hello" }] },
        formVariables: {},
        formFieldsInputs: {},
        isDebug: false,
        ...overrides,
    };
}

function conversation(overrides: Record<string, unknown> = {}) {
    return {
        id: CONVERSATION_ID,
        agentId: AGENT_ID,
        userId: USER_ID,
        anonymousIdentifier: null,
        isDeleted: false,
        ...overrides,
    };
}

function existingTurn(overrides: Record<string, unknown> = {}) {
    return {
        id: TURN_ID,
        conversationId: CONVERSATION_ID,
        requestHash: "hash",
        status: "accepted",
        assistantMessageId: null,
        cancelRequestedAt: null,
        createdAt: new Date("2026-08-21T00:00:00.000Z"),
        updatedAt: new Date("2026-08-21T00:00:00.000Z"),
        conversation: conversation(),
        ...overrides,
    };
}

function makeHarness(options: {
    fastTurn?: Record<string, any> | null;
    managerTurn?: Record<string, any> | null;
    existingConversation?: Record<string, any> | null;
    activeTurn?: Record<string, any> | null;
    fileRows?: Array<Record<string, any>>;
    failSaveTargetName?: string;
    durableTurnsEnabled?: boolean;
} = {}) {
    const saved: Array<{ target: any; entity: any }> = [];
    const manager = {
        findOne: jest.fn(async (target: any, query: any) => {
            const name = target?.name;
            if (name === "AgentOpencodeTurn" && query?.where?.id === TURN_ID) {
                return options.managerTurn ?? null;
            }
            if (name === "AgentChatRecord" && query?.where?.id === CONVERSATION_ID) {
                return options.existingConversation ?? null;
            }
            if (name === "AgentOpencodeTurn" && query?.where?.conversationId === CONVERSATION_ID) {
                if (query?.where?.status) return options.activeTurn ?? null;
                return null;
            }
            return null;
        }),
        create: jest.fn((target: any, entity: any) => ({ ...entity })),
        save: jest.fn(async (target: any, entity: any) => {
            if (target?.name === options.failSaveTargetName) {
                throw new Error("simulated setup failure");
            }
            const value = { id: entity.id ?? `${target.name}-saved-id`, ...entity };
            saved.push({ target, entity: value });
            return value;
        }),
        increment: jest.fn(async () => ({ affected: 1 })),
        count: jest.fn(async () => 1),
    };
    const queryRunner = {
        manager,
        connect: jest.fn(async () => undefined),
        query: jest.fn(async () => []),
        startTransaction: jest.fn(async () => undefined),
        commitTransaction: jest.fn(async () => undefined),
        rollbackTransaction: jest.fn(async () => undefined),
        release: jest.fn(async () => undefined),
    };
    const dataSource = {
        createQueryRunner: jest.fn(() => queryRunner),
        transaction: jest.fn(async (callback: any) => callback(manager)),
    };
    const turnRepository = {
        findOne: jest.fn(async () => options.fastTurn ?? null),
    };
    const fileRepository = {
        find: jest.fn(async () => options.fileRows ?? []),
    };
    const agentsService = {
        getAgentByIdOrThrow: jest.fn(async () => ({
            id: AGENT_ID,
            createMode: "opencode",
            rolePrompt: "You are helpful.",
            sensitiveWordConfig: null,
            thirdPartyIntegration: {
                provider: "opencode",
                baseURL: "https://opencode.example",
                extendedConfig: {
                    workspace: "/workspace",
                    artifactDirTemplate: "artifacts/{conversationId}",
                    model: "openai/gpt-5",
                    durableTurnsEnabled: options.durableTurnsEnabled ?? true,
                },
            },
        })),
    };
    const agentConfigService = {
        getConfig: jest.fn(async () => ({
            createTypes: [
                { key: "opencode", enabled: true, billingMode: "points", points: 2 },
            ],
        })),
    };
    const agentBillingHandler = {
        validateUserPower: jest.fn(async () => undefined),
    };
    const opencodeApiService = {
        normalizeConfig: jest.fn(() => ({
            provider: "opencode",
            baseURL: "https://opencode.example",
            workspace: "/workspace",
            artifactDirTemplate: "artifacts/{conversationId}",
            model: { providerID: "openai", modelID: "gpt-5" },
            basicAuthUser: "opencode",
            basicAuthPassword: "secret",
            useExternalConversation: true,
        })),
        createSession: jest.fn(),
        promptAsync: jest.fn(),
    };
    const userDictService = {
        getGroupValues: jest.fn(async () => ({ locale: "zh-CN" })),
    };
    const telemetry = { increment: jest.fn() };
    return {
        saved,
        manager,
        queryRunner,
        dataSource,
        turnRepository,
        fileRepository,
        agentsService,
        agentConfigService,
        agentBillingHandler,
        opencodeApiService,
        userDictService,
        telemetry,
    };
}

function createService(module: Record<string, any>, harness: ReturnType<typeof makeHarness>) {
    return new module.OpencodeTurnAcceptanceService(
        harness.dataSource,
        harness.turnRepository,
        harness.fileRepository,
        harness.agentsService,
        harness.agentConfigService,
        harness.agentBillingHandler,
        harness.opencodeApiService,
        harness.userDictService,
        harness.telemetry,
    );
}

describe("OpencodeTurnAcceptanceService", () => {
    it("returns an authorized matching duplicate before balance, config, or transaction setup", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness();
        const service = createService(module, harness);
        const request = input();
        const hash = service.hashRequest(request);
        harness.turnRepository.findOne.mockResolvedValue(existingTurn({ requestHash: hash }));
        harness.agentConfigService.getConfig.mockRejectedValue(new Error("configuration changed"));
        harness.agentBillingHandler.validateUserPower.mockRejectedValue(new Error("balance changed"));

        await expect(service.accept(request)).resolves.toMatchObject({
            conversationId: CONVERSATION_ID,
            turnId: TURN_ID,
            status: "accepted",
            duplicate: true,
        });
        expect(harness.agentConfigService.getConfig).not.toHaveBeenCalled();
        expect(harness.agentBillingHandler.validateUserPower).not.toHaveBeenCalled();
        expect(harness.dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it("rejects conflicting turn ID reuse without revealing or mutating the existing turn", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness({ fastTurn: existingTurn({ requestHash: "different" }) });
        const service = createService(module, harness);
        await expect(service.accept(input())).rejects.toThrow(/turn identifier.*conflict/i);
        expect(harness.dataSource.createQueryRunner).not.toHaveBeenCalled();
        expect(harness.manager.save).not.toHaveBeenCalled();
    });

    it("rejects another registered or anonymous owner with a non-revealing error", async () => {
        const module = loadModule();
        if (!module) return;

        const registered = makeHarness({
            fastTurn: existingTurn({ conversation: conversation({ userId: "other-user" }) }),
        });
        await expect(createService(module, registered).accept(input())).rejects.toThrow(/not found/i);

        const anonymous = makeHarness({
            fastTurn: existingTurn({
                conversation: conversation({ anonymousIdentifier: "other-anonymous" }),
            }),
        });
        await expect(
            createService(module, anonymous).accept(
                input({ anonymousIdentifier: "anonymous-owner" }),
            ),
        ).rejects.toThrow(/not found/i);

        const sameAnonymousDifferentUser = makeHarness({
            fastTurn: existingTurn({
                conversation: conversation({ anonymousIdentifier: "anonymous-owner" }),
            }),
        });
        await expect(
            createService(module, sameAnonymousDifferentUser).accept(
                input({
                    userId: "55555555-5555-4555-8555-555555555555",
                    anonymousIdentifier: "anonymous-owner",
                }),
            ),
        ).rejects.toThrow(/not found/i);
    });

    it("performs precheck before local writes and rolls back no local setup on insufficient power", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness();
        harness.agentBillingHandler.validateUserPower.mockRejectedValue(new Error("insufficient"));
        const service = createService(module, harness);
        await expect(service.accept(input())).rejects.toThrow("insufficient");
        expect(harness.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
        expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
        expect(harness.manager.save).not.toHaveBeenCalled();
        expect(harness.opencodeApiService.createSession).not.toHaveBeenCalled();
    });

    it("rejects unowned registered attachments and unverifiable anonymous attachments", async () => {
        const module = loadModule();
        if (!module) return;

        const message = {
            role: "user",
            parts: [
                {
                    type: "file",
                    mediaType: "image/png",
                    url: "https://app.example/uploads/a.png",
                },
            ],
        };
        const registered = makeHarness({ fileRows: [] });
        await expect(
            createService(module, registered).accept(input({ message })),
        ).rejects.toThrow(/authorized attachment/i);

        const anonymous = makeHarness();
        await expect(
            createService(module, anonymous).accept(
                input({ message, anonymousIdentifier: "anonymous-owner" }),
            ),
        ).rejects.toThrow(/anonymous.*attachment/i);
    });

    it("atomically persists a new conversation, one user message, and one accepted turn", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness();
        const service = createService(module, harness);
        await expect(service.accept(input())).resolves.toMatchObject({
            conversationId: CONVERSATION_ID,
            turnId: TURN_ID,
            status: "accepted",
            duplicate: false,
        });

        expect(harness.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
        expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
        expect(harness.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
        expect(harness.saved.map((entry) => entry.target.name)).toEqual([
            "AgentChatRecord",
            "AgentChatMessage",
            "AgentOpencodeTurn",
        ]);
        const savedInputMessage = harness.saved[1]?.entity;
        expect(savedInputMessage.message).toMatchObject({
            id: savedInputMessage.id,
            role: "user",
        });
        const savedTurn = harness.saved.at(-1)?.entity;
        expect(savedTurn).toMatchObject({
            id: TURN_ID,
            conversationId: CONVERSATION_ID,
            status: "accepted",
            assistantMessageId: null,
            artifactBaseline: null,
        });
        expect(JSON.stringify(savedTurn.dispatchSnapshot)).not.toContain("secret");
        expect(harness.manager.increment).toHaveBeenCalledWith(
            expect.anything(),
            { id: CONVERSATION_ID },
            "messageCount",
            1,
        );
        expect(harness.manager.increment).toHaveBeenCalledWith(
            expect.anything(),
            { id: AGENT_ID },
            "userCount",
            1,
        );
        expect(harness.opencodeApiService.createSession).not.toHaveBeenCalled();
        expect(harness.opencodeApiService.promptAsync).not.toHaveBeenCalled();
    });

    it("returns a duplicate found after lock without repeating prechecks", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness();
        const service = createService(module, harness);
        const request = input();
        const hash = service.hashRequest(request);
        harness.manager.findOne.mockImplementation(async (target: any, query: any) => {
            if (target?.name === "AgentOpencodeTurn" && query?.where?.id === TURN_ID) {
                return existingTurn({ requestHash: hash });
            }
            return null;
        });

        await expect(service.accept(request)).resolves.toMatchObject({ duplicate: true });
        expect(harness.agentConfigService.getConfig).not.toHaveBeenCalled();
        expect(harness.agentBillingHandler.validateUserPower).not.toHaveBeenCalled();
        expect(harness.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
        expect(harness.queryRunner.query).toHaveBeenCalledWith(
            "SELECT pg_advisory_xact_lock(hashtext($1))",
            [`opencode-turn:${TURN_ID}`],
        );
        expect(harness.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it("rejects a second active turn before any message write", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness({
            existingConversation: conversation(),
            activeTurn: { id: "55555555-5555-4555-8555-555555555555", status: "running" },
        });
        const service = createService(module, harness);
        await expect(service.accept(input())).rejects.toThrow(/active turn.*55555555/i);
        expect(harness.telemetry.increment).toHaveBeenCalledWith(
            "acceptance_conflict",
            expect.objectContaining({ reason: "active-conversation", turnId: TURN_ID }),
        );
        expect(harness.manager.save).not.toHaveBeenCalled();
        expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it("rejects durable acceptance while the agent rollout flag is disabled", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness({ durableTurnsEnabled: false });
        await expect(createService(module, harness).accept(input())).rejects.toThrow(
            /durable.*disabled/i,
        );
        expect(harness.manager.save).not.toHaveBeenCalled();
        expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it("rolls back conversation and message writes when accepted-turn insertion fails", async () => {
        const module = loadModule();
        if (!module) return;

        const harness = makeHarness({ failSaveTargetName: "AgentOpencodeTurn" });
        const service = createService(module, harness);
        await expect(service.accept(input())).rejects.toThrow("simulated setup failure");
        expect(harness.queryRunner.commitTransaction).not.toHaveBeenCalled();
        expect(harness.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it("authorizes status through the conversation and never exposes frozen snapshots", async () => {
        const module = loadModule();
        if (!module) return;

        const turn = existingTurn({
            dispatchSnapshot: { system: "private" },
            artifactBaseline: { path: "private" },
        });
        const harness = makeHarness({ fastTurn: turn });
        const service = createService(module, harness);
        const status = await service.getStatus({
            agentId: AGENT_ID,
            turnId: TURN_ID,
            userId: USER_ID,
        });

        expect(status).toEqual({
            conversationId: CONVERSATION_ID,
            turnId: TURN_ID,
            status: "accepted",
            cancelRequested: false,
            assistantMessageId: null,
            error: null,
            createdAt: turn.createdAt,
            updatedAt: turn.updatedAt,
            startedAt: null,
            completedAt: null,
            lastActivityAt: null,
            liveProjection: null,
            projectionVersion: "0",
            projectionUpdatedAt: null,
            pendingQuestion: null,
        });
        expect(status).not.toHaveProperty("dispatchSnapshot");
        expect(status).not.toHaveProperty("artifactBaseline");
    });

    it.each(["accepted", "running"])(
        "records cancellation only for the exact %s turn",
        async (status) => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        const active = existingTurn({ status });
        harness.manager.findOne.mockResolvedValue(active);
        const service = createService(module, harness);

        await expect(
            service.requestCancel({
                agentId: AGENT_ID,
                turnId: TURN_ID,
                userId: USER_ID,
            }),
        ).resolves.toMatchObject({ status, cancelRequested: true });
        expect(harness.manager.save).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ id: TURN_ID, cancelRequestedAt: expect.any(Date) }),
        );
        expect(harness.manager.findOne).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                lock: {
                    mode: "pessimistic_write",
                    tables: ["ai_agent_opencode_turn"],
                },
                relations: { conversation: true },
            }),
        );
        expect(harness.opencodeApiService.createSession).not.toHaveBeenCalled();
        },
    );

    it("makes repeated Stop requests idempotent", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        const active = existingTurn({ status: "running" });
        harness.manager.findOne.mockResolvedValue(active);
        const service = createService(module, harness);

        await service.requestCancel({ agentId: AGENT_ID, turnId: TURN_ID, userId: USER_ID });
        await service.requestCancel({ agentId: AGENT_ID, turnId: TURN_ID, userId: USER_ID });
        expect(harness.manager.save).toHaveBeenCalledTimes(1);
        expect(active.cancelRequestedAt).toBeInstanceOf(Date);
    });

    it("authorizes anonymous Stop through both persisted owner identifiers", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        harness.manager.findOne.mockResolvedValue(
            existingTurn({
                conversation: conversation({ anonymousIdentifier: "anonymous-owner" }),
            }),
        );

        await expect(
            createService(module, harness).requestCancel({
                agentId: AGENT_ID,
                turnId: TURN_ID,
                userId: USER_ID,
                anonymousIdentifier: "anonymous-owner",
            }),
        ).resolves.toMatchObject({ cancelRequested: true });
    });

    it.each(["committing", "completed", "cancelled", "failed"])(
        "treats Stop for a %s turn as an idempotent no-op",
        async (status) => {
            const module = loadModule();
            if (!module) return;
            const harness = makeHarness();
            const current = existingTurn({
                status,
                assistantMessageId:
                    status === "committing" ? null : "55555555-5555-4555-8555-555555555555",
            });
            harness.manager.findOne.mockResolvedValue(current);

            await expect(
                createService(module, harness).requestCancel({
                    agentId: AGENT_ID,
                    turnId: TURN_ID,
                    userId: USER_ID,
                }),
            ).resolves.toMatchObject({ status, cancelRequested: false });
            expect(harness.manager.save).not.toHaveBeenCalled();
        },
    );

    it("does not reveal or mutate another owner's turn on Stop", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        harness.manager.findOne.mockResolvedValue(
            existingTurn({ conversation: conversation({ userId: "other-user" }) }),
        );

        await expect(
            createService(module, harness).requestCancel({
                agentId: AGENT_ID,
                turnId: TURN_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(/not found/i);
        expect(harness.manager.save).not.toHaveBeenCalled();
    });
});
