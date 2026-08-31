jest.mock("@buildingai/ai-sdk", () => ({
    createClientsFromServerConfigs: jest.fn().mockResolvedValue([]),
}));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        forbidden: (message: string) => new Error(message),
    },
}));

import { createClientsFromServerConfigs } from "@buildingai/ai-sdk";
import { ToolGatewayMcpBoundary } from "./tool-gateway-mcp-boundary.service";
import * as policy from "./tool-gateway-policy.utils";

describe("ToolGatewayMcpBoundary", () => {
    const boundary = new ToolGatewayMcpBoundary();

    afterEach(() => jest.restoreAllMocks());

    it("validates every configured MCP endpoint before constructing clients", async () => {
        jest.spyOn(policy, "resolveStablePublicAddresses").mockResolvedValue(["93.184.216.34"]);
        await expect(boundary.createClients([
            { id: "public", name: "public", url: "https://example.com/mcp", communicationType: "streamable-http" },
        ])).resolves.toEqual([]);
        expect(createClientsFromServerConfigs).toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ id: "public" })]),
            expect.objectContaining({ name: "buildingai-tool-gateway" }),
        );
    });

    it.each([
        ["not-a-url", "MCP endpoint URL is invalid"],
        ["file:///tmp/mcp", "MCP protocol is not allowed by egress policy"],
        ["http://127.0.0.1/mcp", "MCP endpoint targets a private or metadata network"],
        ["http://[::1]/mcp", "MCP endpoint targets a private or metadata network"],
        ["https://definitely-not-a-real-host.invalid/mcp", "MCP endpoint DNS resolution failed"],
    ])("rejects unsafe endpoint %s", async (url, message) => {
        await expect(boundary.assertEndpoint(url)).rejects.toThrow(message);
        expect(createClientsFromServerConfigs).not.toHaveBeenCalledWith(
            expect.arrayContaining([expect.objectContaining({ url })]),
            expect.anything(),
        );
    });
});
