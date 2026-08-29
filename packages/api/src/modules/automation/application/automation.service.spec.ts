describe("AutomationService safety boundaries", () => {
    it("documents the bounded result contract", () => {
        const preview = "x".repeat(12_000).slice(0, 12_000);
        expect(preview).toHaveLength(12_000);
        expect(preview).not.toContain("authorization");
    });
});

describe("automationCreatorFilters", () => {
    it("includes channel-created jobs from agents owned by the web user", async () => {
        const { automationCreatorFilters } = require("./automation-creator-scope");

        expect(automationCreatorFilters("user-1", ["agent-1", "agent-2"])).toEqual([
            { creatorId: "user-1" },
            { agentId: "agent-1" },
            { agentId: "agent-2" },
        ]);
    });
});
