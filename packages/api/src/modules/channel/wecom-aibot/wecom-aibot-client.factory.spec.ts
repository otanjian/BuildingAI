const connect = jest.fn();
const disconnect = jest.fn();
const handlers = new Map<string, (...args: any[]) => void>();

jest.mock("@wecom/aibot-node-sdk", () => ({
    __esModule: true,
    default: {
        WSClient: jest.fn().mockImplementation(() => ({
            connect,
            disconnect,
            on: jest.fn((event: string, handler: (...args: any[]) => void) => {
                handlers.set(event, handler);
                return this;
            }),
        })),
    },
}));

import { WecomAibotClientFactory } from "./wecom-aibot-client.factory";

describe("WecomAibotClientFactory", () => {
    beforeEach(() => {
        connect.mockReset();
        disconnect.mockReset();
        handlers.clear();
    });

    it("creates an official SDK client with credentials", () => {
        const client = new WecomAibotClientFactory().create({
            botId: "bot-1",
            secret: "secret",
        });
        expect(client).toBeDefined();
    });

    it("tests credentials by authenticating and immediately disconnecting", async () => {
        connect.mockImplementation(() => {
            queueMicrotask(() => handlers.get("authenticated")?.());
        });

        await expect(
            new WecomAibotClientFactory().testCredentials("bot-1", "secret", 1000),
        ).resolves.toEqual({ success: true });
        expect(connect).toHaveBeenCalled();
        expect(disconnect).toHaveBeenCalled();
    });

    it("rejects safely when authentication fails", async () => {
        connect.mockImplementation(() => {
            queueMicrotask(() => handlers.get("error")?.(new Error("invalid secret")));
        });

        await expect(
            new WecomAibotClientFactory().testCredentials("bot-1", "secret", 1000),
        ).rejects.toThrow("invalid secret");
        expect(disconnect).toHaveBeenCalled();
    });
});
