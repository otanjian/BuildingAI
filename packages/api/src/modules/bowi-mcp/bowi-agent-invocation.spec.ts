import { EHCS_PLATFORM_AGENT_NAME } from "@buildingai/constants/shared/ehcs-agent.constant";

import { buildBowiMcpHeaders } from "./utils/bowi-agent-invocation";
import { verifyBowiInvocationAssertion } from "./utils/bowi-invocation-assertion";

describe("Bowi agent invocation headers", () => {
    const previousEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...previousEnv,
            BOWI_MCP_INVOCATION_SECRET: "test-invocation-secret-that-is-long-enough",
        };
    });

    afterAll(() => {
        process.env = previousEnv;
    });

    it("adds a short-lived login assertion only to the canonical Bowi server", () => {
        const headers = buildBowiMcpHeaders({
            serverName: "bowi-mcp",
            existing: { "x-existing": "kept" },
            invocation: {
                userId: "user-1",
                agentId: "agent-1",
                agentName: "General agent",
                conversationId: "conversation-1",
                authSource: "login",
            },
        });
        expect(headers?.["x-existing"]).toBe("kept");
        expect(verifyBowiInvocationAssertion(headers!["x-buildingai-bowi-invocation"])).toMatchObject({
            userId: "user-1",
            authSource: "login",
            capabilities: ["sap.read", "sap.rfc"],
        });
        expect(
            buildBowiMcpHeaders({
                serverName: "other",
                invocation: {
                    userId: "user-1",
                    agentId: "agent-1",
                    agentName: "General agent",
                    authSource: "login",
                },
            }),
        ).toBeUndefined();
    });

    it("grants only the EHCS application capability to its published agent", () => {
        const headers = buildBowiMcpHeaders({
            serverName: "bowi-mcp",
            invocation: {
                userId: "creator-1",
                agentId: "ehcs-agent",
                agentName: EHCS_PLATFORM_AGENT_NAME,
                authSource: "site_access_token",
            },
        });
        expect(verifyBowiInvocationAssertion(headers!["x-buildingai-bowi-invocation"])).toMatchObject({
            authSource: "site_access_token",
            capabilities: ["ehcs.operator"],
        });
    });
});
