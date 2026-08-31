jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => new Proxy({}, { get: () => (value: unknown) => value }));

import { UserMemoryWebController } from "./user-memory.controller";

describe("UserMemoryWebController ownership", () => {
  it("requires an authenticated playground user for every operation", async () => {
    const service: any = {
      getUserMemories: jest.fn(), createUserMemory: jest.fn(), updateUserMemory: jest.fn(),
      findUserMemoryById: jest.fn(), deactivateUserMemory: jest.fn(), deactivateAllUserMemories: jest.fn(),
    };
    const controller = new UserMemoryWebController(service);
    await expect(controller.list()).rejects.toThrow();
    await expect(controller.create({ content: "x", category: "preference" } as any)).rejects.toThrow();
    await expect(controller.update("id", {} as any)).rejects.toThrow();
    await expect(controller.remove("id")).rejects.toThrow();
    await expect(controller.clear()).rejects.toThrow();
    expect(service.getUserMemories).not.toHaveBeenCalled();
  });

  it("passes the authenticated user id to service methods", async () => {
    const service: any = {
      getUserMemories: jest.fn().mockResolvedValue([]),
      createUserMemory: jest.fn().mockResolvedValue({ id: "m1" }),
      updateUserMemory: jest.fn().mockResolvedValue({ id: "m1" }),
      findUserMemoryById: jest.fn().mockResolvedValue({ id: "m1" }),
      deactivateUserMemory: jest.fn().mockResolvedValue(undefined),
      deactivateAllUserMemories: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new UserMemoryWebController(service);
    const user: any = { id: "u1" };
    await controller.list("20", user);
    await controller.create({ content: "hello", category: "preference" } as any, user);
    await controller.update("m1", { content: "updated" } as any, user);
    await controller.remove("m1", user);
    await controller.clear(user);
    expect(service.getUserMemories).toHaveBeenCalledWith("u1", 20);
    expect(service.createUserMemory).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    expect(service.updateUserMemory).toHaveBeenCalledWith("m1", "u1", { content: "updated" });
    expect(service.findUserMemoryById).toHaveBeenCalledWith("m1", "u1");
    expect(service.deactivateUserMemory).toHaveBeenCalledWith("m1", "u1");
    expect(service.deactivateAllUserMemories).toHaveBeenCalledWith("u1");
  });
});
