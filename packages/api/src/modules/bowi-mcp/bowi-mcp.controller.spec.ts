jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({ WebController: () => (target: unknown) => target }),
    { virtual: true },
);

import { BowiMcpController } from "./controllers/bowi-mcp.controller";

describe("BowiMcpController", () => {
    it("requires MCP content negotiation and delegates authenticated JSON-RPC", async () => {
        const runtime = { dispatch: jest.fn().mockResolvedValue({ jsonrpc: "2.0", id: 1, result: {} }) };
        const controller = new BowiMcpController(runtime as never);
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        const response = { status, json } as never;

        await controller.handle(
            {
                headers: { accept: "application/json, text/event-stream", "content-type": "application/json" },
            } as never,
            response,
            { jsonrpc: "2.0", id: 1, method: "initialize" },
        );

        expect(runtime.dispatch).toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ jsonrpc: "2.0", id: 1, result: {} });
    });

    it("rejects unsupported media negotiation before dispatch", async () => {
        const runtime = { dispatch: jest.fn() };
        const controller = new BowiMcpController(runtime as never);
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        await controller.handle({ headers: { accept: "application/json" } } as never, { status, json } as never, {});
        expect(status).toHaveBeenCalledWith(406);
        expect(runtime.dispatch).not.toHaveBeenCalled();
    });

    it("accepts notifications without sending a JSON-RPC response body", async () => {
        const runtime = { dispatch: jest.fn() };
        const controller = new BowiMcpController(runtime as never);
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();
        const end = jest.fn();

        await controller.handle(
            {
                headers: {
                    accept: "application/json, text/event-stream",
                    "content-type": "application/json",
                },
            } as never,
            { status, json, end } as never,
            { jsonrpc: "2.0", method: "notifications/initialized" },
        );

        expect(runtime.dispatch).toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(202);
        expect(end).toHaveBeenCalled();
        expect(json).not.toHaveBeenCalled();
    });

    it("reports optional GET event streaming as unsupported", async () => {
        const runtime = { dispatch: jest.fn() };
        const controller = new BowiMcpController(runtime as never);
        const sendStatus = jest.fn();

        await controller.handle(
            { method: "GET", headers: { accept: "text/event-stream" } } as never,
            { sendStatus } as never,
            {} as never,
        );

        expect(sendStatus).toHaveBeenCalledWith(405);
        expect(runtime.dispatch).not.toHaveBeenCalled();
    });
});
