jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => new Proxy({}, { get: () => (value: unknown) => value }));

import { AgentMemoryWebController } from "./agent-memory.controller";

describe("AgentMemoryWebController ownership", () => {
    it("requires an authenticated playground user", async () => {
        const service: any = {
            listAgentMemoriesForUser: jest.fn(),
            listAccessibleAgents: jest.fn(),
            createAgentMemoryForUser: jest.fn(),
            updateAgentMemoryForUser: jest.fn(),
            findAgentMemoryById: jest.fn(),
            deactivateAgentMemory: jest.fn(),
            deactivateAllAgentMemories: jest.fn(),
        };
        const controller = new AgentMemoryWebController(service);
        await expect(controller.list()).rejects.toThrow();
        await expect(controller.agents()).rejects.toThrow();
        await expect(controller.create({ agentId: "a1", content: "x" } as any)).rejects.toThrow();
        await expect(controller.update("m1", {} as any)).rejects.toThrow();
        await expect(controller.remove("m1")).rejects.toThrow();
        await expect(controller.clear()).rejects.toThrow();
    });

    it("passes the complete playground identity to permission-aware service methods", async () => {
        const service: any = {
            listAgentMemoriesForUser: jest.fn().mockResolvedValue([]),
            listAccessibleAgents: jest.fn().mockResolvedValue([]),
            createAgentMemoryForUser: jest.fn().mockResolvedValue({ id: "m1" }),
            updateAgentMemoryForUser: jest.fn().mockResolvedValue({ id: "m1" }),
            findAgentMemoryById: jest.fn().mockResolvedValue({ id: "m1" }),
            deactivateAgentMemory: jest.fn().mockResolvedValue(undefined),
            deactivateAllAgentMemories: jest.fn().mockResolvedValue(undefined),
        };
        const controller = new AgentMemoryWebController(service);
        const user: any = { id: "u1", isRoot: 0, tenantId: "t1" };
        await controller.list("20", user);
        await controller.agents(user);
        await controller.create({ agentId: "a1", content: "hello" } as any, user);
        await controller.update("m1", { agentId: "a2", content: "updated" } as any, user);
        await controller.remove("m1", user);
        await controller.clear(user);
        expect(service.listAgentMemoriesForUser).toHaveBeenCalledWith(user, 20);
        expect(service.listAccessibleAgents).toHaveBeenCalledWith(user);
        expect(service.createAgentMemoryForUser).toHaveBeenCalledWith(user, {
            agentId: "a1",
            content: "hello",
        });
        expect(service.updateAgentMemoryForUser).toHaveBeenCalledWith("m1", user, {
            agentId: "a2",
            content: "updated",
        });
        expect(service.findAgentMemoryById).toHaveBeenCalledWith("m1", "u1");
        expect(service.deactivateAgentMemory).toHaveBeenCalledWith("m1", "u1");
        expect(service.deactivateAllAgentMemories).toHaveBeenCalledWith("u1");
    });
});
