import { AutomationAdapterRegistry } from "./automation-adapter.registry";

describe("AutomationAdapterRegistry", () => {
    it("registers providers without scheduler-specific branches", () => {
        const adapter = { channel: "fake", sendText: jest.fn(), replyToInteraction: jest.fn(), validateTarget: jest.fn() };
        const registry = new AutomationAdapterRegistry([adapter]);
        expect(registry.get("fake")).toBe(adapter);
        expect(() => registry.get("missing")).toThrow("Unsupported automation channel");
    });
});
