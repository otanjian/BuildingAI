jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        conflict: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));
jest.mock("../application/automation.service", () => ({
    AutomationService: class AutomationService {},
}));

import { AutomationBowiProvider } from "./automation-bowi.provider";

describe("AutomationBowiProvider", () => {
    const scope = {
        channel: "feishu",
        accountId: "connection-1",
        conversationId: "chat-1",
        targetType: "chat" as const,
        targetId: "chat-1",
    };

    function principal(overrides: Record<string, unknown> = {}) {
        return {
            actor: { kind: "user" as const, id: "user-1" },
            subjectUserId: "user-1",
            authSource: "login" as const,
            agentId: "agent-1",
            conversationId: "chat-1",
            capabilities: new Set(["automation.personal"]),
            automationScope: scope,
            ...overrides,
        } as any;
    }

    function harness() {
        const service = {
            create: jest.fn().mockResolvedValue({ id: "job-1", creatorId: "user-1" }),
            listForCreator: jest.fn().mockResolvedValue([]),
            list: jest.fn().mockResolvedValue([]),
            listForScope: jest.fn().mockResolvedValue([]),
            detailForCreator: jest.fn().mockResolvedValue({ id: "job-1" }),
            detail: jest.fn().mockResolvedValue({ id: "job-1" }),
            update: jest.fn().mockResolvedValue({ id: "job-1" }),
            updateForCreator: jest.fn().mockResolvedValue({ id: "job-1" }),
            transition: jest.fn().mockResolvedValue({ id: "job-1", status: "paused" }),
            transitionForScope: jest.fn().mockResolvedValue({ id: "job-1", status: "paused" }),
            transitionForCreator: jest.fn().mockResolvedValue({ id: "job-1", status: "paused" }),
            runOnce: jest.fn().mockResolvedValue({ id: "run-1" }),
            runOnceForCreator: jest.fn().mockResolvedValue({ id: "run-1" }),
        };
        return { provider: new AutomationBowiProvider(service as never), service };
    }

    it("publishes the complete durable task management catalog", () => {
        const { provider } = harness();
        expect(provider.tools.map((tool) => tool.name)).toEqual([
            "automation_create",
            "automation_search",
            "automation_get",
            "automation_update",
            "automation_pause",
            "automation_resume",
            "automation_run",
            "automation_delete",
        ]);
        expect(provider.tools.every((tool) => tool.inputSchema.additionalProperties === false)).toBe(true);
    });

    it("binds create to the verified principal scope instead of model-supplied identity", async () => {
        const { provider, service } = harness();
        const tool = provider.tools.find((item) => item.name === "automation_create")!;
        await tool.execute(
            {
                name: "Daily report",
                prompt: "Read the purchase report",
                schedule: {
                    kind: "cron",
                    expression: "25 7 * * *",
                    timezone: "Asia/Shanghai",
                },
                idempotencyKey: "event-1",
            },
            principal(),
        );
        expect(service.create).toHaveBeenCalledWith(
            expect.objectContaining({
                context: expect.objectContaining({
                    actorId: "user-1",
                    channel: "feishu",
                    accountId: "connection-1",
                    conversationId: "chat-1",
                    eventId: "event-1",
                }),
                agentId: "agent-1",
                target: expect.objectContaining({ targetId: "chat-1" }),
            }),
        );
        expect(service.create.mock.calls[0][0].context).not.toHaveProperty("userId");
    });

    it("requires a signed delivery scope for creation", async () => {
        const { provider, service } = harness();
        const tool = provider.tools.find((item) => item.name === "automation_create")!;
        await expect(
            tool.execute(
                {
                    name: "Daily report",
                    prompt: "Read the purchase report",
                    schedule: { kind: "cron", expression: "25 7 * * *", timezone: "Asia/Shanghai" },
                    idempotencyKey: "event-1",
                },
                principal({ automationScope: undefined }),
            ),
        ).rejects.toThrow("channel scope");
        expect(service.create).not.toHaveBeenCalled();
    });

    it("validates arguments for local channel and web facade calls too", async () => {
        const { provider, service } = harness();
        await expect(
            provider.executeForCreator(
                "automation_update",
                { taskId: "job-1", unexpected: true },
                "user-1",
            ),
        ).rejects.toThrow("Invalid tool arguments");
        expect(service.updateForCreator).not.toHaveBeenCalled();
    });

    it("routes query, update, run and delete through the service boundary", async () => {
        const { provider, service } = harness();
        const p = principal();
        await provider.tools.find((item) => item.name === "automation_search")!.execute({}, p);
        await provider.tools.find((item) => item.name === "automation_update")!.execute(
            { taskId: "job-1", name: "Updated", expectedUpdatedAt: "2026-08-28T00:00:00.000Z" },
            p,
        );
        await provider.tools.find((item) => item.name === "automation_run")!.execute(
            { taskId: "job-1", idempotencyKey: "run-1" },
            p,
        );
        await provider.tools.find((item) => item.name === "automation_delete")!.execute(
            { taskId: "job-1", expectedUpdatedAt: "2026-08-28T00:00:00.000Z" },
            p,
        );
        expect(service.listForScope).toHaveBeenCalled();
        expect(service.update).toHaveBeenCalled();
        expect(service.runOnce).toHaveBeenCalled();
        expect(service.transitionForScope).toHaveBeenCalledWith(expect.anything(), "job-1", "cancel", "2026-08-28T00:00:00.000Z");
    });
});
