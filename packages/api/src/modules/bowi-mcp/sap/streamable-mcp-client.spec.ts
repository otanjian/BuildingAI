import { StreamableMcpClient } from "./streamable-mcp-client";

describe("StreamableMcpClient", () => {
    it("initializes, calls a tool, and always closes its transport", async () => {
        const client = {
            connect: jest.fn().mockResolvedValue(undefined),
            callTool: jest.fn().mockResolvedValue({ content: [{ type: "text", text: '{"ok":true}' }] }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const transport = {
            sessionId: "session-1",
            terminateSession: jest.fn().mockResolvedValue(undefined),
        };
        const factory = jest.fn().mockReturnValue({ client, transport });
        const mcp = new StreamableMcpClient(factory as never, 1234);

        await expect(mcp.call("http://sap.test/mcp", "healthcheck", {})).resolves.toEqual({ ok: true });
        expect(client.connect).toHaveBeenCalledWith(expect.anything(), { timeout: 1234 });
        expect(client.callTool).toHaveBeenCalledWith(
            { name: "healthcheck", arguments: {} },
            undefined,
            { timeout: 1234, maxTotalTimeout: 1234 },
        );
        expect(client.close).toHaveBeenCalled();
        expect(transport.terminateSession).toHaveBeenCalled();
    });

    it("turns upstream tool errors into sanitized errors and closes", async () => {
        const client = {
            connect: jest.fn().mockResolvedValue(undefined),
            callTool: jest.fn().mockResolvedValue({
                isError: true,
                content: [{ type: "text", text: "secret upstream stack" }],
            }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const transport = { terminateSession: jest.fn().mockResolvedValue(undefined) };
        const mcp = new StreamableMcpClient(
            jest.fn().mockReturnValue({ client, transport }) as never,
            500,
        );

        await expect(mcp.call("http://sap.test/mcp", "healthcheck", {})).rejects.toMatchObject({
            code: "SAP_UPSTREAM_REJECTED",
            message: "SAP upstream rejected the tool call",
        });
        expect(client.close).toHaveBeenCalled();
        expect(transport.terminateSession).toHaveBeenCalled();
    });

    it("reports unavailable without leaking raw connection errors", async () => {
        const client = {
            connect: jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED password=secret")),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const transport = { terminateSession: jest.fn().mockResolvedValue(undefined) };
        const mcp = new StreamableMcpClient(
            jest.fn().mockReturnValue({ client, transport }) as never,
            500,
        );

        await expect(mcp.call("http://sap.test/mcp", "healthcheck", {})).rejects.toMatchObject({
            code: "SAP_UPSTREAM_UNAVAILABLE",
            message: "SAP upstream is unavailable",
        });
        expect(client.close).toHaveBeenCalled();
    });

    it("runs multiple operations in one session and closes it once", async () => {
        const client = {
            connect: jest.fn().mockResolvedValue(undefined),
            callTool: jest
                .fn()
                .mockResolvedValueOnce({ content: [{ type: "text", text: '{"step":1}' }] })
                .mockResolvedValueOnce({ content: [{ type: "text", text: '{"step":2}' }] }),
            close: jest.fn().mockResolvedValue(undefined),
        };
        const transport = { terminateSession: jest.fn().mockResolvedValue(undefined) };
        const mcp = new StreamableMcpClient(
            jest.fn().mockReturnValue({ client, transport }) as never,
            500,
        );

        const result = await mcp.withSession("http://sap.test/mcp", async (session) => [
            await session.call("first", {}),
            await session.call("second", {}),
        ]);

        expect(result).toEqual([{ step: 1 }, { step: 2 }]);
        expect(client.connect).toHaveBeenCalledTimes(1);
        expect(client.close).toHaveBeenCalledTimes(1);
        expect(transport.terminateSession).toHaveBeenCalledTimes(1);
    });
});
