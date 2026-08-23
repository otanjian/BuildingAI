jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("@buildingai/core/modules", () => ({
    AppBillingService: class AppBillingService {},
}));
jest.mock(
    "@modules/config/services/agent-config.service",
    () => ({
        AgentConfigService: class AgentConfigService {},
    }),
    { virtual: true },
);

import { AgentChatRecord, AgentOpencodeTurn } from "@buildingai/db/entities";
import { readFileSync } from "node:fs";

import { initializeOpencodeIframeBillingState } from "../utils/opencode-iframe-billing";
import { OpencodeIframeBillingReconcilerService } from "./opencode-iframe-billing-reconciler.service";

describe("OpencodeIframeBillingReconcilerService", () => {
    it("uses the requested half-hour cron schedule", () => {
        const source = readFileSync(__filename.replace(/\.spec\.ts$/, ".ts"), "utf8");
        expect(source).toContain('@Cron("*/30 * * * *"');
    });

    it("skips the batch when another API instance owns the advisory lock", async () => {
        const test = harness({ advisoryLock: false });

        await test.service.handleIframeBillingReconciliation();

        expect(test.repository.createQueryBuilder).not.toHaveBeenCalled();
        expect(test.queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it("defers a busy session without reading messages or settling", async () => {
        const test = harness({ remoteStatus: { type: "busy" } });

        await test.service.handleIframeBillingReconciliation();

        expect(test.api.listSessionMessages).not.toHaveBeenCalled();
        expect(test.dataSource.transaction).not.toHaveBeenCalled();
    });

    it("settles an idle completed turn with the current points rule and one transaction", async () => {
        const test = harness();

        await test.service.handleIframeBillingReconciliation();

        expect(test.billing.deduct).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: "user-1",
                conversationId: "conversation-1",
                agentId: "agent-1",
                usage: expect.objectContaining({ totalTokens: 1500 }),
                billingRule: { power: 1, tokens: 1000 },
                associationNo: expect.stringMatching(/^opencode-turn:if:/),
            }),
            test.transactionManager,
        );
        expect(test.transactionManager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation-1" },
            expect.objectContaining({ totalTokens: 1500, consumedPower: 2 }),
        );
        expect(test.queryRunner.query).toHaveBeenLastCalledWith(
            "SELECT pg_advisory_unlock(hashtext($1))",
            ["cron:opencode-iframe-billing:reconcile"],
        );
        expect(test.agentConfig.getConfig).toHaveBeenCalledTimes(1);
    });

    it("records usage and advances the cursor without charging when points billing is disabled", async () => {
        const test = harness({ billingEnabled: false });

        await test.service.handleIframeBillingReconciliation();

        expect(test.billing.deduct).toHaveBeenCalledWith(
            expect.objectContaining({ billingRule: undefined }),
            test.transactionManager,
        );
        expect(test.transactionManager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation-1" },
            expect.objectContaining({ totalTokens: 1500, consumedPower: 0 }),
        );
    });

    it("advances the cursor without charging when a native durable turn owns the message", async () => {
        const test = harness({ nativeTurnExists: true });

        await test.service.handleIframeBillingReconciliation();

        expect(test.billing.deduct).not.toHaveBeenCalled();
        expect(test.transactionManager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation-1" },
            expect.objectContaining({ totalTokens: 0, consumedPower: 0 }),
        );
    });

    it("isolates one runtime failure and continues with the next conversation", async () => {
        const test = harness({ twoRecords: true, firstMessageReadFails: true });

        await test.service.handleIframeBillingReconciliation();

        expect(test.api.listSessionMessages).toHaveBeenCalledTimes(2);
        expect(test.dataSource.transaction).toHaveBeenCalledTimes(1);
        expect(test.transactionManager.update).toHaveBeenCalledWith(
            AgentChatRecord,
            { id: "conversation-2" },
            expect.anything(),
        );
    });
});

function harness(options?: {
    advisoryLock?: boolean;
    remoteStatus?: { type: "idle" | "busy" };
    nativeTurnExists?: boolean;
    twoRecords?: boolean;
    firstMessageReadFails?: boolean;
    billingEnabled?: boolean;
}) {
    const startedAt = new Date("2026-08-23T04:00:00.000Z");
    const makeRecord = (suffix: string) => ({
        id: `conversation-${suffix}`,
        agentId: `agent-${suffix}`,
        userId: `user-${suffix}`,
        anonymousIdentifier: null,
        opencodeSessionId: `session-${suffix}`,
        totalTokens: 0,
        consumedPower: 0,
        metadata: {
            provider: "opencode",
            opencodeIframeBilling: initializeOpencodeIframeBillingState(undefined, startedAt),
        },
        agent: {
            id: `agent-${suffix}`,
            createMode: "opencode",
            thirdPartyIntegration: { provider: "opencode", baseURL: "http://opencode.test" },
        },
    });
    const records = options?.twoRecords ? [makeRecord("1"), makeRecord("2")] : [makeRecord("1")];
    const queryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => records),
    };
    const repository = { createQueryBuilder: jest.fn(() => queryBuilder) };
    const queryRunner = {
        connect: jest.fn(async () => undefined),
        query: jest
            .fn()
            .mockResolvedValueOnce([{ locked: options?.advisoryLock ?? true }])
            .mockResolvedValue([{ unlocked: true }]),
        release: jest.fn(async () => undefined),
    };
    const transactionManager = {
        findOne: jest.fn(async (entity: unknown, findOptions: any) => {
            if (entity === AgentChatRecord) {
                return records.find((record) => record.id === findOptions.where.id) ?? null;
            }
            if (entity === AgentOpencodeTurn) {
                return options?.nativeTurnExists ? { id: "native-turn" } : null;
            }
            return null;
        }),
        update: jest.fn(async () => ({ affected: 1 })),
    };
    const dataSource = {
        createQueryRunner: jest.fn(() => queryRunner),
        transaction: jest.fn(async (callback: (manager: any) => unknown) =>
            callback(transactionManager),
        ),
    };
    let messageReads = 0;
    const api = {
        getSessionStatus: jest.fn(async () => options?.remoteStatus ?? { type: "idle" }),
        listSessionMessages: jest.fn(async ({ sessionId }: { sessionId: string }) => {
            messageReads += 1;
            if (options?.firstMessageReadFails && messageReads === 1) {
                throw new Error("runtime unavailable");
            }
            const suffix = sessionId.endsWith("2") ? "2" : "1";
            return [
                {
                    info: {
                        id: `remote-user-${suffix}`,
                        role: "user",
                        time: { created: Date.parse("2026-08-23T04:01:00.000Z") },
                    },
                    parts: [],
                },
                {
                    info: {
                        id: `remote-assistant-${suffix}`,
                        role: "assistant",
                        parentID: `remote-user-${suffix}`,
                        finish: "stop",
                        time: { created: Date.parse("2026-08-23T04:02:00.000Z") },
                        tokens: { input: 1000, output: 500, total: 1500 },
                    },
                    parts: [],
                },
            ];
        }),
    };
    const billing = {
        deduct: jest.fn(
            async (params: { billingRule?: unknown; usage: { totalTokens?: number } }) =>
                params.billingRule && Number(params.usage.totalTokens ?? 0) > 0 ? 2 : 0,
        ),
    };
    const agentConfig = {
        getConfig: jest.fn(async () => ({
            createTypes: [
                {
                    key: "opencode",
                    enabled: options?.billingEnabled ?? true,
                    billingMode: "points",
                    points: 1,
                },
            ],
        })),
    };
    const service = new OpencodeIframeBillingReconcilerService(
        dataSource as any,
        repository as any,
        api as any,
        billing as any,
        agentConfig as any,
    );
    return {
        service,
        dataSource,
        repository,
        queryRunner,
        transactionManager,
        api,
        billing,
        agentConfig,
    };
}
