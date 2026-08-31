jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ ConsoleController: () => () => undefined }),
    { virtual: true },
);
jest.mock(
    "@common/decorators/permissions.decorator",
    () => ({ Permissions: () => () => undefined }),
    { virtual: true },
);
jest.mock("./wecom-aibot-channel.service", () => ({
    WecomAibotChannelService: class WecomAibotChannelService {},
}));

import { WecomAibotChannelController } from "./wecom-aibot-channel.controller";

describe("WecomAibotChannelController", () => {
    it("delegates each lifecycle action to the connection-scoped service method", async () => {
        const service = {
            listConnections: jest.fn().mockResolvedValue({ items: [] }),
            createConnection: jest.fn().mockResolvedValue({ connectionId: "connection-1" }),
            getConnection: jest.fn().mockResolvedValue({ connectionId: "connection-1" }),
            updateConnection: jest.fn().mockResolvedValue({ connectionId: "connection-1" }),
            testConnection: jest.fn().mockResolvedValue({ success: true }),
            toggleConnection: jest.fn().mockResolvedValue({ enabled: true }),
            deleteConnection: jest.fn().mockResolvedValue(undefined),
        };
        const controller = new WecomAibotChannelController(service as never);

        await controller.listConnections({ page: 1, pageSize: 15 });
        await controller.createConnection({ agentId: "agent", name: "name" } as never);
        await controller.getConnection("connection-1");
        await controller.updateConnection("connection-1", { name: "next" });
        await controller.testConnection({ botId: "bot" });
        await controller.testSavedConnection("connection-1", {});
        await controller.toggleConnection("connection-1", { enabled: true });
        await controller.deleteConnection("connection-1");

        expect(service.listConnections).toHaveBeenCalledWith({ page: 1, pageSize: 15 });
        expect(service.createConnection).toHaveBeenCalledTimes(1);
        expect(service.getConnection).toHaveBeenCalledWith("connection-1");
        expect(service.updateConnection).toHaveBeenCalledWith("connection-1", { name: "next" });
        expect(service.testConnection).toHaveBeenNthCalledWith(2, {
            connectionId: "connection-1",
        });
        expect(service.toggleConnection).toHaveBeenCalledWith("connection-1", true);
        expect(service.deleteConnection).toHaveBeenCalledWith("connection-1");
    });
});
