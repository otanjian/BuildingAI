jest.mock("../handlers/agent-billing", () => ({ AgentBillingHandler: class {} }));
jest.mock("./agent-chat-completion.service", () => ({ AgentChatCompletionService: class {} }));
jest.mock("./agents.service", () => ({ AgentsService: class {} }));
jest.mock("../../model/services/ai-model.service", () => ({ AiModelService: class {} }));

import { AgentInvocationService } from "./agent-invocation.service";

const parent = (overrides: Record<string, unknown> = {}) => ({
    id: "parent-agent",
    name: "Parent",
    createBy: "user-1",
    createMode: "direct",
    tenantId: "tenant-1",
    projectId: "project-1",
    toolConfig: {
        agentDelegation: {
            enabled: true,
            allowedAgentIds: ["child-agent"],
            maxCallsPerTurn: 2,
            timeoutMs: 5000,
        },
    },
    ...overrides,
});

describe("AgentInvocationService", () => {
    function createService(target: Record<string, unknown> | null = null) {
        const agentsService = { findOneById: jest.fn().mockResolvedValue(target), findOne: jest.fn().mockResolvedValue(target) };
        const modelService = { findOne: jest.fn().mockResolvedValue({ billingRule: {} }) };
        const billing = {
            validateUserPower: jest.fn().mockResolvedValue(undefined),
            deduct: jest.fn().mockResolvedValue(0),
        };
        const completion = { streamChat: jest.fn() };
        const moduleRef = { get: jest.fn().mockReturnValue(completion) };
        const service = new AgentInvocationService(
            agentsService as any,
            modelService as any,
            billing as any,
            moduleRef as any,
        );
        return { service, agentsService, modelService, billing, completion };
    }

    it("returns a bounded policy only for enabled Direct parents", () => {
        const { service } = createService();
        expect(service.getPolicy(parent() as any)).toEqual({
            allowedAgentIds: new Set(["child-agent"]),
            maxCallsPerTurn: 2,
            timeoutMs: 5000,
        });
        expect(service.getPolicy(parent({ createMode: "coze" }) as any)).toBeNull();
        expect(
            service.getPolicy(parent({ toolConfig: { agentDelegation: { enabled: false } } }) as any),
        ).toBeNull();
    });

    it("rejects non-allowlisted or recursive calls before model execution", async () => {
        const target = { id: "child-agent", name: "Child", createBy: "user-1", createMode: "direct", modelConfig: { id: "model-1" } };
        const { service, completion } = createService(target);
        const result = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "other-agent",
            task: "do work",
            userId: "user-1",
            callId: "call-1",
            callCount: 0,
        });
        expect(result).toMatchObject({ status: "failed", errorCode: "AGENT_NOT_ALLOWED" });
        expect(completion.streamChat).not.toHaveBeenCalled();
    });

    it("rejects a non-Direct or out-of-scope target before model execution", async () => {
        const target = {
            id: "child-agent",
            name: "Child",
            createBy: "user-1",
            createMode: "direct",
            tenantId: "other-tenant",
            projectId: "other-project",
            modelConfig: { id: "model-1" },
        };
        const { service, completion } = createService(target);
        const result = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            userId: "user-1",
            tenantId: "tenant-1",
            projectId: "project-1",
            callId: "call-scope",
            callCount: 0,
        });
        expect(result).toMatchObject({ status: "failed", errorCode: "AGENT_SCOPE_DENIED" });
        expect(completion.streamChat).not.toHaveBeenCalled();
    });

    it("enforces the per-turn call limit", async () => {
        const { service, agentsService } = createService();
        const result = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            userId: "user-1",
            callId: "call-1",
            callCount: 2,
        });
        expect(result).toMatchObject({ status: "failed", errorCode: "CALL_LIMIT_REACHED" });
        expect(agentsService.findOne).not.toHaveBeenCalled();
    });

    it("runs an allowlisted child through the shared blocking stream", async () => {
        const target = {
            id: "child-agent",
            name: "Child",
            createBy: "user-1",
            createMode: "direct",
            modelConfig: { id: "model-1" },
        };
        const { service, completion, billing } = createService(target);
        completion.streamChat.mockImplementation(async (_params: any, response: any) => {
            response.write(`data: ${JSON.stringify({ type: "text-delta", delta: "child answer" })}\n\n`);
            response.write(`data: ${JSON.stringify({ type: "data-usage", data: { totalTokens: 4 } })}\n\n`);
            response.end();
        });
        const result = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            context: { ticket: "T-1" },
            userId: "user-1",
            parentConversationId: "conversation-1",
            callId: "call-1",
            callCount: 0,
        });
        expect(result).toMatchObject({ status: "succeeded", answer: "child answer", agentName: "Child" });
        expect(completion.streamChat).toHaveBeenCalledWith(
            expect.objectContaining({ saveConversation: false, internalInvocation: expect.objectContaining({ disableDelegation: true }) }),
            expect.anything(),
        );
        expect(billing.validateUserPower).toHaveBeenCalled();
    });

    it("bounds child output and reports a timeout", async () => {
        const target = {
            id: "child-agent",
            name: "Child",
            createBy: "user-1",
            createMode: "direct",
            modelConfig: { id: "model-1" },
        };
        const { service, completion } = createService(target);
        completion.streamChat.mockImplementation(async (_params: any, response: any) => {
            response.write(`data: ${JSON.stringify({ type: "text-delta", delta: "x".repeat(9000) })}\n\n`);
            response.end();
        });
        const bounded = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            userId: "user-1",
            callId: "call-output",
            callCount: 0,
        });
        expect(bounded.status).toBe("succeeded");
        expect(bounded.answer).toHaveLength(8000);

        completion.streamChat.mockImplementation(() => new Promise(() => undefined));
        const timedOut = await service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            userId: "user-1",
            callId: "call-timeout",
            timeoutMs: 1000,
            callCount: 0,
        });
        expect(timedOut).toMatchObject({ status: "failed", errorCode: "AGENT_TIMEOUT" });
    }, 5000);

    it("propagates cancellation to the child runner", async () => {
        const target = {
            id: "child-agent",
            name: "Child",
            createBy: "user-1",
            createMode: "direct",
            modelConfig: { id: "model-1" },
        };
        const { service, completion } = createService(target);
        completion.streamChat.mockImplementation(() => new Promise(() => undefined));
        const controller = new AbortController();
        const pending = service.invoke({
            parentAgent: parent() as any,
            targetAgentId: "child-agent",
            task: "do work",
            userId: "user-1",
            abortSignal: controller.signal,
            callId: "call-cancel",
            timeoutMs: 5000,
            callCount: 0,
        });
        setTimeout(() => controller.abort(), 10);
        await expect(pending).resolves.toMatchObject({ status: "failed", errorCode: "AGENT_CANCELLED" });
    }, 5000);
});
