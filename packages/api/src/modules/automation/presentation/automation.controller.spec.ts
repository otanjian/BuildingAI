jest.mock("@buildingai/decorators", () => ({ Playground: () => () => undefined }));
jest.mock("../mcp/automation-bowi.provider", () => ({ AutomationBowiProvider: class {} }));
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ WebController: () => (target: unknown) => target }),
    { virtual: true },
);

import type { UserPlayground } from "@buildingai/db";

import { AutomationController } from "./automation.controller";

const user = { id: "user-1" } as UserPlayground;

describe("AutomationController", () => {
    it("routes web deletion through the canonical automation_delete operation", async () => {
        const provider = {
            executeForCreator: jest.fn().mockResolvedValue({ id: "task-1", status: "cancelled" }),
        };
        const controller = new AutomationController(provider as never);

        await controller.remove("task-1", { expectedUpdatedAt: "2026-08-28T00:00:00.000Z" }, user);

        expect(provider.executeForCreator).toHaveBeenCalledWith(
            "automation_delete",
            { taskId: "task-1", expectedUpdatedAt: "2026-08-28T00:00:00.000Z" },
            user.id,
        );
    });
});
