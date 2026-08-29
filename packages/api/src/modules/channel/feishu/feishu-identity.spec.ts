import { createBowiInvocationAssertion } from "../../bowi-mcp/utils/bowi-invocation-assertion";
import { resolveFeishuIdentityAssertion } from "./feishu-identity";

describe("Feishu identity assertion", () => {
    const previousSecret = process.env.BOWI_MCP_INVOCATION_SECRET;

    beforeEach(() => {
        process.env.BOWI_MCP_INVOCATION_SECRET = "feishu-test-secret";
    });

    afterAll(() => {
        if (previousSecret === undefined) delete process.env.BOWI_MCP_INVOCATION_SECRET;
        else process.env.BOWI_MCP_INVOCATION_SECRET = previousSecret;
    });

    it("accepts only a signed assertion for the requested agent", () => {
        const assertion = createBowiInvocationAssertion({
            userId: "buildingai-user-1",
            agentId: "agent-1",
            conversationId: "chat-1",
            authSource: "login",
            capabilities: ["automation.personal"],
        });

        expect(resolveFeishuIdentityAssertion(assertion, "agent-1")).toEqual(
            expect.objectContaining({ userId: "buildingai-user-1", authSource: "login" }),
        );
        expect(resolveFeishuIdentityAssertion(assertion, "agent-2")).toBeUndefined();
    });
});
