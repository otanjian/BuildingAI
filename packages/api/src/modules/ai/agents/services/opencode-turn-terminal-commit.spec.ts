jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("../handlers/agent-billing", () => ({
    AgentBillingHandler: class AgentBillingHandler {},
}));
jest.mock("./agent-chat-record.service", () => ({
    AgentChatRecordService: class AgentChatRecordService {},
}));
jest.mock("./opencode-turn.repository", () => ({
    OpencodeTurnRepository: class OpencodeTurnRepository {},
}));

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_PATH = resolve(__dirname, "opencode-turn-terminal-commit.ts");
const TURN_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const INPUT_MESSAGE_ID = "33333333-3333-4333-8333-333333333333";
const ASSISTANT_MESSAGE_ID = "44444444-4444-4444-8444-444444444444";
const LEASE_TOKEN = "55555555-5555-4555-8555-555555555555";

function loadModule(): Record<string, any> | undefined {
    expect(existsSync(SERVICE_PATH)).toBe(true);
    if (!existsSync(SERVICE_PATH)) return undefined;
    return require(SERVICE_PATH) as Record<string, any>;
}

function makeHarness(options: {
    terminal?: boolean;
    billingEnabled?: boolean;
    billingFailure?: Error;
    saveFailure?: Error;
} = {}) {
    const conversation = {
        id: CONVERSATION_ID,
        agentId: "66666666-6666-4666-8666-666666666666",
        userId: "77777777-7777-4777-8777-777777777777",
        anonymousIdentifier: null,
    };
    const turn = {
        id: TURN_ID,
        conversationId: CONVERSATION_ID,
        conversation,
        status: options.terminal ? "completed" : "committing",
        leaseToken: options.terminal ? null : LEASE_TOKEN,
        assistantMessageId: options.terminal ? ASSISTANT_MESSAGE_ID : null,
        inputMessageId: INPUT_MESSAGE_ID,
        dispatchSnapshot: options.terminal
            ? null
            : {
                  billing: {
                      enabled: options.billingEnabled !== false,
                      power: 2,
                      tokens: 1000,
                  },
              },
    };
    const saved: Array<{ target: any; entity: any }> = [];
    const manager = {
        findOne: jest.fn(async () => turn),
        create: jest.fn((_target: any, entity: any) => ({ ...entity })),
        save: jest.fn(async (target: any, entity: any) => {
            if (options.saveFailure) throw options.saveFailure;
            saved.push({ target, entity });
            return entity;
        }),
    };
    const dataSource = {
        transaction: jest.fn(async (callback: any) => callback(manager)),
    };
    const billing = {
        deduct: jest.fn(async () => {
            if (options.billingFailure) throw options.billingFailure;
            return options.billingEnabled === false ? 0 : 2;
        }),
    };
    const records = { updateStats: jest.fn(async () => undefined) };
    const turns = {
        findLocked: jest.fn(async () => turn),
        transition: jest.fn(async (_manager: any, input: any) => {
            Object.assign(turn, input.patch, { status: input.to });
            return { changed: true, turn };
        }),
        getTerminalNoop: jest.fn(async () => ({ changed: false, turn })),
    };
    return { turn, saved, manager, dataSource, billing, records, turns };
}

function createService(module: Record<string, any>, harness: ReturnType<typeof makeHarness>) {
    return new module.OpencodeTurnTerminalCommitService(
        harness.dataSource,
        harness.billing,
        harness.records,
        harness.turns,
    );
}

function successInput(overrides: Record<string, unknown> = {}) {
    return {
        turnId: TURN_ID,
        leaseToken: LEASE_TOKEN,
        assistantMessageId: ASSISTANT_MESSAGE_ID,
        outcome: "completed",
        parts: [{ type: "text", text: "done" }],
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        artifacts: [{ kind: "html", relativePath: "report.html", url: "/artifact" }],
        completedAt: new Date("2026-08-21T02:00:00.000Z"),
        ...overrides,
    };
}

describe("OpencodeTurnTerminalCommitService", () => {
    it("atomically persists one assistant, turn deduction, statistics, and terminal state", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        const result = await createService(module, harness).commit(successInput());

        expect(result).toMatchObject({ status: "completed", assistantMessageId: ASSISTANT_MESSAGE_ID });
        expect(harness.saved).toHaveLength(1);
        expect(harness.saved[0].entity).toMatchObject({
            id: ASSISTANT_MESSAGE_ID,
            conversationId: CONVERSATION_ID,
            parentId: INPUT_MESSAGE_ID,
            status: "completed",
            message: {
                id: ASSISTANT_MESSAGE_ID,
                role: "assistant",
                usage: expect.objectContaining({ totalTokens: 15 }),
                userConsumedPower: 2,
            },
        });
        expect(harness.billing.deduct).toHaveBeenCalledWith(
            expect.objectContaining({
                associationNo: `opencode-turn:${TURN_ID}`,
                conversationId: CONVERSATION_ID,
            }),
            harness.manager,
        );
        expect(harness.records.updateStats).toHaveBeenCalledWith(
            CONVERSATION_ID,
            harness.manager,
        );
        expect(harness.turns.transition).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({
                to: "completed",
                patch: expect.objectContaining({ assistantMessageId: ASSISTANT_MESSAGE_ID }),
            }),
        );
    });

    it("uses zero deduction for free/debug snapshot while keeping actual usage", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ billingEnabled: false });
        await createService(module, harness).commit(successInput());

        expect(harness.billing.deduct).not.toHaveBeenCalled();
        expect(harness.saved[0].entity.message).toMatchObject({
            usage: { totalTokens: 15 },
            userConsumedPower: 0,
        });
    });

    it("requires one visible non-blank terminal projection", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();

        await expect(
            createService(module, harness).commit(successInput({ parts: [], artifacts: [] })),
        ).rejects.toThrow(/non-blank/i);
        expect(harness.billing.deduct).not.toHaveBeenCalled();
        expect(harness.manager.save).not.toHaveBeenCalled();
    });

    it("commits a visible failed billing outcome after the charged transaction rolls back", async () => {
        const module = loadModule();
        if (!module) return;
        const billingFailure = makeHarness({ billingFailure: new Error("余额不足") });
        await expect(
            createService(module, billingFailure).commit(successInput()),
        ).resolves.toMatchObject({ status: "failed", duplicate: false });
        expect(billingFailure.dataSource.transaction).toHaveBeenCalledTimes(2);
        expect(billingFailure.billing.deduct).toHaveBeenCalledTimes(1);
        expect(billingFailure.saved.at(-1)?.entity.message).toMatchObject({
            role: "assistant",
            parts: [{ type: "text", text: expect.stringMatching(/积分|余额/) }],
            userConsumedPower: 0,
        });
        expect(billingFailure.turns.transition).toHaveBeenCalledWith(
            billingFailure.manager,
            expect.objectContaining({
                to: "failed",
                patch: expect.objectContaining({ errorCode: "OPENCODE_BILLING_INSUFFICIENT" }),
            }),
        );
    });

    it("rolls back and retries later on transient billing or persistence failure", async () => {
        const module = loadModule();
        if (!module) return;
        const billingFailure = makeHarness({ billingFailure: new Error("billing database offline") });
        await expect(
            createService(module, billingFailure).commit(successInput()),
        ).rejects.toThrow("billing database offline");
        expect(billingFailure.turns.transition).not.toHaveBeenCalled();

        const saveFailure = makeHarness({ saveFailure: new Error("save failed") });
        await expect(createService(module, saveFailure).commit(successInput())).rejects.toThrow(
            "save failed",
        );
        expect(saveFailure.turns.transition).not.toHaveBeenCalled();
    });

    it("returns a terminal no-op without a duplicate assistant or charge", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ terminal: true });

        await expect(createService(module, harness).commit(successInput())).resolves.toMatchObject({
            status: "completed",
            assistantMessageId: ASSISTANT_MESSAGE_ID,
            duplicate: true,
        });
        expect(harness.manager.save).not.toHaveBeenCalled();
        expect(harness.billing.deduct).not.toHaveBeenCalled();
        expect(harness.records.updateStats).not.toHaveBeenCalled();
    });

    it.each([
        ["cancelled", "Turn cancelled by user"],
        ["failed", "OpenCode turn failed"],
    ])("persists a non-blank %s outcome", async (outcome, fallbackText) => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness({ billingEnabled: false });
        await createService(module, harness).commit(
            successInput({ outcome, parts: [], artifacts: [], errorMessage: fallbackText }),
        );

        expect(harness.saved[0].entity.message.parts).toEqual([
            { type: "text", text: fallbackText },
        ]);
        expect(harness.turns.transition).toHaveBeenCalledWith(
            harness.manager,
            expect.objectContaining({ to: outcome }),
        );
    });

    it("bills partial usage at most once for a cancelled outcome", async () => {
        const module = loadModule();
        if (!module) return;
        const harness = makeHarness();
        const service = createService(module, harness);

        await service.commit(
            successInput({
                outcome: "cancelled",
                parts: [{ type: "text", text: "Partial result before cancellation" }],
                artifacts: [],
                usage: { inputTokens: 400, outputTokens: 100, totalTokens: 500 },
            }),
        );

        expect(harness.billing.deduct).toHaveBeenCalledTimes(1);
        expect(harness.billing.deduct).toHaveBeenCalledWith(
            expect.objectContaining({
                usage: expect.objectContaining({ totalTokens: 500 }),
                associationNo: `opencode-turn:${TURN_ID}`,
            }),
            harness.manager,
        );
    });
});
