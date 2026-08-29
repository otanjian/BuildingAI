import { deriveAutomationCreatorId } from "./automation-identity";

describe("deriveAutomationCreatorId", () => {
    it("does not collide external users across provider accounts", () => {
        const first = deriveAutomationCreatorId({
            channel: "feishu",
            accountId: "a1",
            externalActorId: "ou-1",
        });
        const second = deriveAutomationCreatorId({
            channel: "feishu",
            accountId: "a2",
            externalActorId: "ou-1",
        });
        expect(first).not.toBe(second);
        expect(first).toMatch(/^external:feishu:/);
    });

    it("uses only a verified local binding when one is available", () => {
        expect(
            deriveAutomationCreatorId({
                channel: "feishu",
                accountId: "a1",
                externalActorId: "ou-1",
                localCreatorId: "user-1",
            }),
        ).toBe("user-1");
    });
});
