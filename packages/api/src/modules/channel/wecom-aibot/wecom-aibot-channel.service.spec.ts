jest.mock("@buildingai/cache", () => ({ RedisService: class RedisService {} }));
jest.mock("@buildingai/db/@nestjs/typeorm", () => ({ InjectRepository: () => () => undefined }));
jest.mock("@buildingai/db/entities/ai-agent.entity", () => ({ Agent: class Agent {} }));
jest.mock("@buildingai/db/entities/wecom-aibot-connection.entity", () => ({
    WecomAibotConnection: class WecomAibotConnection {},
}));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
        conflict: (message: string) => new Error(message),
    },
}));

import { decryptWecomAibotCredential } from "./wecom-aibot-credential.crypto";
import { WecomAibotChannelService } from "./wecom-aibot-channel.service";

describe("WecomAibotChannelService", () => {
    const originalKey = process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY;

    beforeEach(() => {
        process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY = "wecom-service-test-key";
        process.env.BUILDINGAI_API_URL = "http://api.example.test";
    });

    afterAll(() => {
        if (originalKey === undefined) delete process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY;
        else process.env.WECOM_AIBOT_CREDENTIAL_ENCRYPTION_KEY = originalKey;
        delete process.env.BUILDINGAI_API_URL;
    });

    const makeService = (leaseMode?: "success" | "contended" | "lost") => {
        const values = new Map<string, string>();
        const records: any[] = [];
        const executeCommand = jest.fn(async (...args: string[]) => {
            if (args[0] === "SET") {
                if (leaseMode === "contended") return null;
                values.set(args[1], args[2]);
                return "OK";
            }
            if (args[0] === "EVAL" && args[1].includes("expire")) {
                if (leaseMode === "lost") return 0;
                return values.get(args[3]) === args[4] ? 1 : 0;
            }
            if (args[0] === "EVAL") {
                if (values.get(args[3]) === args[4]) values.delete(args[3]);
                return 1;
            }
            return null;
        });
        const redis = {
            get: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
            set: jest.fn((key: string, value: string) => {
                values.set(key, value);
                return Promise.resolve(undefined);
            }),
            keys: jest.fn(async (pattern: string) =>
                [...values.keys()].filter((key) =>
                    new RegExp(`^${pattern.replaceAll("*", ".*")}$`).test(key),
                ),
            ),
            mdel: jest.fn(async (keys: string[]) => keys.forEach((key) => values.delete(key))),
            ...(leaseMode ? { executeCommand } : {}),
        };
        const agent = {
            id: "00000000-0000-4000-8000-000000000001",
            name: "Support Agent",
            createMode: "direct",
        };
        const agentRepository = {
            findOne: jest.fn().mockResolvedValue(agent),
        };
        const repository = {
            create: jest.fn((value: any) => ({
                id: `connection-${records.length + 1}`,
                createdAt: new Date(),
                updatedAt: new Date(),
                ...value,
            })),
            save: jest.fn(async (value: any) => {
                const index = records.findIndex((item) => item.id === value.id);
                if (index >= 0) records[index] = value;
                else records.push(value);
                return value;
            }),
            find: jest.fn(async ({ where }: any = {}) =>
                records
                    .filter((candidate) =>
                        where
                            ? Object.entries(where).every(
                                  ([key, value]) => candidate[key] === value,
                              )
                            : true,
                    )
                    .map((item) => ({ ...item, agent })),
            ),
            findOne: jest.fn(async ({ where }: any) => {
                const item = records.find((candidate) =>
                    Object.entries(where).every(([key, value]) => candidate[key] === value),
                );
                return item ? { ...item, agent } : null;
            }),
            delete: jest.fn(async (id: string) => {
                const index = records.findIndex((item) => item.id === id);
                if (index >= 0) records.splice(index, 1);
            }),
        };
        const client = {
            connect: jest.fn().mockReturnThis(),
            disconnect: jest.fn(),
            on: jest.fn((event: string, handler: (...args: any[]) => void) => {
                handlers.set(event, handler);
                return client;
            }),
            replyStream: jest.fn().mockResolvedValue({}),
        };
        const handlers = new Map<string, (...args: any[]) => void>();
        const factory = {
            create: jest.fn(() => client),
            testCredentials: jest.fn().mockResolvedValue({ success: true }),
        };
        const service = new WecomAibotChannelService(
            redis as never,
            agentRepository as never,
            repository as never,
            factory as never,
        );
        return {
            service,
            redis,
            values,
            records,
            repository,
            agentRepository,
            factory,
            client,
            handlers,
            executeCommand,
        };
    };

    const createDto = {
        agentId: "00000000-0000-4000-8000-000000000001",
        name: "Customer Support",
        botId: "  BOT-ABC-123456  ",
        botSecret: "very-secret-bot-value",
        agentAccessToken: "published-agent-token",
    };

    it("creates a disabled encrypted connection and masks credentials in its response", async () => {
        const { service, records } = makeService();

        const result = await service.createConnection(createDto);

        expect(result).toMatchObject({
            connectionId: "connection-1",
            botId: "BOT-••••3456",
            enabled: false,
            connectionState: "stopped",
            hasBotSecret: true,
            hasAgentAccessToken: true,
        });
        expect(result).not.toHaveProperty("botSecret");
        expect(result).not.toHaveProperty("agentAccessToken");
        expect(records[0].normalizedBotId).toBe("bot-abc-123456");
        expect(decryptWecomAibotCredential(records[0].botSecretEncrypted)).toBe(
            "very-secret-bot-value",
        );
    });

    it("preserves encrypted secrets when an edit submits blank secret inputs", async () => {
        const { service, records } = makeService();
        await service.createConnection(createDto);
        const originalSecret = records[0].botSecretEncrypted;
        const originalToken = records[0].agentAccessTokenEncrypted;

        await service.updateConnection("connection-1", {
            name: "Renamed connection",
            botSecret: "",
            agentAccessToken: "",
        });

        expect(records[0].botSecretEncrypted).toBe(originalSecret);
        expect(records[0].agentAccessTokenEncrypted).toBe(originalToken);
    });

    it("rejects duplicate BotIDs and non-standard agents", async () => {
        const { service, agentRepository } = makeService();
        await service.createConnection(createDto);

        await expect(
            service.createConnection({ ...createDto, name: "Second", botId: "bot-abc-123456" }),
        ).rejects.toThrow(/already bound/i);

        agentRepository.findOne.mockResolvedValueOnce({
            id: createDto.agentId,
            name: "Code Agent",
            createMode: "opencode",
        });
        await expect(
            service.createConnection({ ...createDto, botId: "different-bot" }),
        ).rejects.toThrow(/only standard agents/i);
    });

    it("redacts credentials from credential-test errors", async () => {
        const { service, factory } = makeService();
        factory.testCredentials.mockRejectedValueOnce(
            new Error(`invalid ${createDto.botSecret} and ${createDto.agentAccessToken}`),
        );

        await expect(service.testConnection(createDto)).rejects.toThrow(
            "WeCom credential test failed: invalid [REDACTED] and [REDACTED]",
        );
    });

    it("does not open a credential-test socket for a BotID that is already enabled", async () => {
        const { service, factory } = makeService();
        await service.createConnection(createDto);
        await service.toggleConnection("connection-1", true);
        factory.testCredentials.mockClear();

        await expect(service.testConnection(createDto)).rejects.toThrow(
            "Cannot test a BotID while its saved connection is enabled",
        );
        expect(factory.testCredentials).not.toHaveBeenCalled();
    });

    it("starts, stops, and deletes only the targeted connection", async () => {
        const { service, records, repository, client } = makeService();
        await service.createConnection(createDto);
        await service.createConnection({ ...createDto, name: "Sales", botId: "sales-bot" });

        await service.toggleConnection("connection-1", true);
        expect(records[0].enabled).toBe(true);
        expect(records[1].enabled).toBe(false);
        expect(client.connect).toHaveBeenCalledTimes(1);

        await service.toggleConnection("connection-1", false);
        expect(client.disconnect).toHaveBeenCalledTimes(1);

        await service.deleteConnection("connection-1");
        expect(repository.delete).toHaveBeenCalledWith("connection-1");
        expect(records).toHaveLength(1);
        expect(records[0].id).toBe("connection-2");
    });

    it("tracks authentication and disconnection state without exposing raw errors", async () => {
        const { service, handlers } = makeService();
        await service.createConnection(createDto);
        await service.toggleConnection("connection-1", true);

        handlers.get("authenticated")?.();
        await expect(service.getConnection("connection-1")).resolves.toMatchObject({
            connectionState: "connected",
        });

        handlers.get("disconnected")?.("remote closed");
        await expect(service.getConnection("connection-1")).resolves.toMatchObject({
            connectionState: "error",
            lastError: "remote closed",
        });
    });

    it("restores enabled connections during application bootstrap and disconnects when lease renewal is lost", async () => {
        jest.useFakeTimers();
        const { service, repository, records, client, redis } = makeService("lost");
        await service.createConnection(createDto);
        records[0].enabled = true;

        expect(repository.find).not.toHaveBeenCalledWith({
            where: { enabled: true },
            relations: ["agent"],
        });
        await service.onApplicationBootstrap();
        expect(client.connect).toHaveBeenCalledTimes(1);

        await jest.advanceTimersByTimeAsync(10_000);
        await Promise.resolve();
        await Promise.resolve();
        expect(client.disconnect).toHaveBeenCalled();
        await expect(service.getConnection("connection-1")).resolves.toMatchObject({
            connectionState: "error",
            lastError: "Connection lease was lost",
        });

        await redis.set("wecom:event:connection-1:event-1", "1");
        await service.deleteConnection("connection-1");
        expect(redis.mdel).toHaveBeenCalled();
        jest.useRealTimers();
    });

    it("does not open a second socket when another instance owns the lease", async () => {
        const { service, factory } = makeService("contended");
        await service.createConnection(createDto);

        const result = await service.toggleConnection("connection-1", true);

        expect(factory.create).not.toHaveBeenCalled();
        expect(result).toMatchObject({
            enabled: true,
            connectionState: "error",
            lastError: "Connection is owned by another instance",
        });
    });

    it("serializes shared stream slots for one conversation scope", async () => {
        jest.useFakeTimers();
        const { service } = makeService();

        const first = (service as any).reserveStreamUpdateSlot("connection-1", "group:chat-1");
        const second = (service as any).reserveStreamUpdateSlot("connection-1", "group:chat-1");
        await first;
        let secondFinished = false;
        void second.then(() => (secondFinished = true));
        await Promise.resolve();
        expect(secondFinished).toBe(false);

        await jest.advanceTimersByTimeAsync(4_000);
        await second;
        expect(secondFinished).toBe(true);
        jest.useRealTimers();
    });

    it("deduplicates text messages, keeps one conversation per chat, and ignores media", async () => {
        const { service, client, values } = makeService();
        await service.createConnection(createDto);
        await service.toggleConnection("connection-1", true);
        const runtime = (service as any).activeConnections.get("connection-1");
        const stream = jest
            .spyOn((service as any).publishedAgentChatClient, "stream")
            .mockImplementation(async ({ onText }: any) => {
                onText("Hello");
                return { answer: "Hello world", conversationId: "conversation-1" };
            });
        jest.spyOn(service as any, "reserveStreamUpdateSlot").mockResolvedValue(undefined);
        const textFrame = {
            headers: { req_id: "request-1" },
            body: {
                msgid: "message-1",
                aibotid: "bot-abc-123456",
                chattype: "single",
                from: { userid: "user-1" },
                msgtype: "text",
                text: { content: "Hi" },
            },
        };

        await (service as any).handleMessage(runtime.config, client, textFrame);
        await (service as any).handleMessage(runtime.config, client, textFrame);
        await (service as any).handleMessage(runtime.config, client, {
            ...textFrame,
            body: { ...textFrame.body, msgid: "message-2", msgtype: "image" },
        });

        expect(stream).toHaveBeenCalledTimes(1);
        expect(stream).toHaveBeenCalledWith(
            expect.objectContaining({
                anonymousIdentifier: "wecom:connection-1:single:user-1",
                message: "Hi",
            }),
        );
        expect(values.get("wecom:conversation:connection-1:single:user-1")).toBe("conversation-1");
    });

    it("continues the previous Agent conversation within the same chat scope", async () => {
        const { service, client } = makeService();
        await service.createConnection(createDto);
        await service.toggleConnection("connection-1", true);
        const runtime = (service as any).activeConnections.get("connection-1");
        jest.spyOn(service as any, "reserveStreamUpdateSlot").mockResolvedValue(undefined);
        const stream = jest
            .spyOn((service as any).publishedAgentChatClient, "stream")
            .mockResolvedValueOnce({ answer: "first answer", conversationId: "conversation-1" })
            .mockResolvedValueOnce({ answer: "second answer", conversationId: "conversation-1" });
        const frame = (msgid: string, content: string) => ({
            headers: { req_id: msgid },
            body: {
                msgid,
                aibotid: "bot-abc-123456",
                chattype: "single",
                from: { userid: "user-1" },
                msgtype: "text",
                text: { content },
            },
        });

        await (service as any).handleMessage(runtime.config, client, frame("message-1", "first"));
        await (service as any).handleMessage(runtime.config, client, frame("message-2", "second"));

        expect(stream).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({ conversationId: "conversation-1", message: "second" }),
        );
    });

    it("serializes messages from the same chat", async () => {
        const { service, client } = makeService();
        await service.createConnection(createDto);
        await service.toggleConnection("connection-1", true);
        const runtime = (service as any).activeConnections.get("connection-1");
        const order: string[] = [];
        let releaseFirst!: () => void;
        const firstGate = new Promise<void>((resolve) => (releaseFirst = resolve));
        jest.spyOn((service as any).publishedAgentChatClient, "stream").mockImplementation(
            async ({ message }: any) => {
                order.push(`start:${message}`);
                if (message === "first") await firstGate;
                order.push(`finish:${message}`);
                return { answer: message };
            },
        );
        jest.spyOn(service as any, "reserveStreamUpdateSlot").mockResolvedValue(undefined);
        const frame = (msgid: string, content: string) => ({
            headers: { req_id: msgid },
            body: {
                msgid,
                aibotid: "bot-abc-123456",
                chattype: "group",
                chatid: "chat-1",
                from: { userid: "user-1" },
                msgtype: "text",
                text: { content },
            },
        });

        const first = (service as any).handleMessage(
            runtime.config,
            client,
            frame("message-a", "first"),
        );
        const second = (service as any).handleMessage(
            runtime.config,
            client,
            frame("message-b", "second"),
        );
        for (let index = 0; index < 10 && order.length === 0; index += 1) {
            await new Promise((resolve) => setImmediate(resolve));
        }
        expect(order).toEqual(["start:first"]);
        releaseFirst();
        await Promise.all([first, second]);
        expect(order).toEqual(["start:first", "finish:first", "start:second", "finish:second"]);
    });
});
