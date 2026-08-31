jest.mock("@larksuiteoapi/node-sdk", () => ({
    WSClient: jest.fn().mockImplementation(() => ({
        start: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
    })),
    Client: jest.fn().mockImplementation(() => ({
        im: { v1: { message: { reply: jest.fn().mockResolvedValue(undefined) } } },
        cardkit: {
            v1: {
                card: {
                    create: jest.fn().mockResolvedValue({ data: { card_id: "card-1" } }),
                    settings: jest.fn().mockResolvedValue(undefined),
                },
                cardElement: {
                    content: jest.fn().mockResolvedValue(undefined),
                    update: jest.fn().mockResolvedValue(undefined),
                },
            },
        },
    })),
    EventDispatcher: jest.fn().mockImplementation(() => ({
        register: jest.fn().mockReturnThis(),
    })),
    LoggerLevel: { error: "error" },
}));
jest.mock("@buildingai/cache", () => ({ RedisService: class RedisService {} }));
jest.mock("@buildingai/dict", () => ({ DictService: class DictService {} }));
jest.mock("@buildingai/db/@nestjs/typeorm", () => ({ InjectRepository: () => () => undefined }));
jest.mock("@buildingai/db/entities/ai-agent.entity", () => ({ Agent: class Agent {} }));
jest.mock("@buildingai/db/entities/user.entity", () => ({ User: class User {} }));
jest.mock("@buildingai/db/typeorm", () => ({ Repository: class Repository {} }));
jest.mock("@buildingai/errors", () => ({
    HttpErrorFactory: {
        badRequest: (message: string) => new Error(message),
        notFound: (message: string) => new Error(message),
    },
}));

import { FeishuChannelService } from "./feishu-channel.service";

describe("FeishuChannelService", () => {
    const makeService = (
        agent: Record<string, unknown> = { name: "Agent", createMode: "direct" },
    ) => {
        const values = new Map<string, string>();
        const dictService = {
            findAll: jest.fn().mockResolvedValue([]),
            get: jest.fn().mockResolvedValue(undefined),
            set: jest.fn().mockResolvedValue(undefined),
        };
        const redisService = {
            get: jest.fn((key: string) => Promise.resolve(values.get(key) ?? null)),
            set: jest.fn((key: string, value: string) => {
                values.set(key, value);
                return Promise.resolve(undefined);
            }),
            del: jest.fn(async (key: string) => void values.delete(key)),
            keys: jest.fn(async (pattern: string) =>
                [...values.keys()].filter((key) =>
                    new RegExp(`^${pattern.replaceAll("*", ".*")}$`).test(key),
                ),
            ),
        };
        const agentRepository = {
            findOne: jest.fn().mockResolvedValue(agent),
        };
        return {
            service: new FeishuChannelService(
                dictService as never,
                redisService as never,
                agentRepository as never,
            ),
            dictService,
            redisService,
        };
    };

    it("shows legacy Dict configuration when the connection table is empty", async () => {
        const agentId = "agent-legacy-config";
        const agent = { id: agentId, name: "Legacy Agent", createMode: "direct" };
        const dictService = {
            findAll: jest.fn().mockResolvedValue([
                {
                    key: agentId,
                    group: "feishu-agent-channel",
                    value: JSON.stringify({
                        appId: "cli_1234567890abcdef",
                        appSecret: "secret",
                        agentAccessToken: "token",
                        enabled: true,
                        onlyMentioned: true,
                    }),
                },
            ]),
            get: jest.fn(),
            set: jest.fn(),
        };
        const repository = {
            createQueryBuilder: jest.fn(() => ({
                leftJoinAndSelect() {
                    return this;
                },
                orderBy() {
                    return this;
                },
                addOrderBy() {
                    return this;
                },
                getMany: jest.fn().mockResolvedValue([]),
            })),
        };
        const service = new FeishuChannelService(
            dictService as never,
            {} as never,
            { findOne: jest.fn().mockResolvedValue(agent) } as never,
            undefined,
            repository as never,
            undefined,
        );

        const result = await service.listConnections({ page: 1, pageSize: 15 });

        expect(result.total).toBe(1);
        expect(result.items[0]).toMatchObject({
            connectionId: agentId,
            agentId,
            agentName: "Legacy Agent",
            appId: "cli_••••cdef",
            enabled: true,
        });
        expect(result.items[0]).not.toHaveProperty("appSecret");
    });

    it("rejects an OpenCode agent because Feishu only supports standard agents", async () => {
        const { service } = makeService({
            name: "Legacy Code Agent",
            createMode: "opencode",
        });
        await expect(
            service.save({
                agentId: "00000000-0000-4000-8000-000000000004",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
            }),
        ).rejects.toThrow(/only standard agents/i);
    });

    it("requires a published token when testing a standard-agent connection", async () => {
        const { service } = makeService();
        await expect(
            service.test({
                agentId: "00000000-0000-4000-8000-000000000005",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
            }),
        ).rejects.toThrow("Agent access token is required");
    });

    it("tests a saved connection without recursing through the legacy test entrypoint", async () => {
        const connection = {
            id: "connection-1",
            agentId: "agent-1",
            appId: "cli_1234567890abcdef",
            appSecretEncrypted: "app-secret-ciphertext",
            agentAccessTokenEncrypted: "agent-token-ciphertext",
            credentialRef: null,
            enabled: true,
            onlyMentioned: true,
            migrationStatus: "legacy",
            agent: { id: "agent-1", name: "Agent", createMode: "direct" },
        };
        const repository = {
            findOne: jest.fn().mockResolvedValue(connection),
            find: jest.fn().mockResolvedValue([connection]),
        };
        const service = new FeishuChannelService(
            {} as never,
            {} as never,
            { findOne: jest.fn().mockResolvedValue(connection.agent) } as never,
            undefined,
            repository as never,
            undefined,
        );
        (service as any).decryptSecret = jest.fn((value: string) =>
            value === connection.appSecretEncrypted ? "app-secret" : "agent-token",
        );
        const fetchMock = jest
            .spyOn(global, "fetch")
            .mockResolvedValue(new Response(JSON.stringify({ code: 0 }), { status: 200 }));

        await expect(
            service.testConnection({ connectionId: connection.id }),
        ).resolves.toEqual({ success: true });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        fetchMock.mockRestore();
    });

    it("returns a timeout error when Feishu credential auth does not respond", async () => {
        const { service } = makeService();
        jest.useFakeTimers();
        const fetchMock = jest
            .spyOn(global, "fetch")
            .mockImplementation((_url, init) =>
                new Promise<Response>((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () =>
                        reject(new DOMException("Aborted", "AbortError")),
                    );
                }),
            );
        const resultPromise = service.test({
            agentId: "agent-1",
            appId: "cli_1234567890abcdef",
            appSecret: "secret",
            agentAccessToken: "token",
        });
        const result = resultPromise.catch((error) => error);
        await jest.advanceTimersByTimeAsync(10_001);
        await expect(result).resolves.toMatchObject({ message: expect.stringMatching(/timed out/i) });
        fetchMock.mockRestore();
        jest.useRealTimers();
    });

    it("does not route an OpenCode event to the public endpoint", async () => {
        const { service } = makeService({
            id: "agent-legacy",
            createMode: "opencode",
        });
        const fetchMock = jest.spyOn(global, "fetch");
        const reply = jest.fn().mockResolvedValue(undefined);
        await (service as any).handleEvent(
            {
                agentId: "agent-legacy",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "legacy-token",
                enabled: true,
                onlyMentioned: false,
            },
            { im: { v1: { message: { reply } } } },
            {
                event_id: "legacy-event-1",
                message: {
                    message_id: "legacy-message-1",
                    chat_id: "chat-1",
                    chat_type: "p2p",
                    message_type: "text",
                    content: JSON.stringify({ text: "hello" }),
                },
            },
        );
        expect(fetchMock).not.toHaveBeenCalled();
        expect(reply).toHaveBeenCalled();
        fetchMock.mockRestore();
    });

    it("does not route unsupported third-party agents to the standard endpoint", async () => {
        const { service } = makeService({
            id: "agent-coze",
            createMode: "coze",
        });
        const fetchMock = jest.spyOn(global, "fetch");
        const reply = jest.fn().mockResolvedValue(undefined);
        await (service as any).handleEvent(
            {
                agentId: "agent-coze",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: false,
            },
            { im: { v1: { message: { reply } } } },
            {
                event_id: "coze-event-1",
                message: {
                    message_id: "coze-message-1",
                    chat_id: "chat-1",
                    chat_type: "p2p",
                    message_type: "text",
                    content: JSON.stringify({ text: "hello" }),
                },
            },
        );
        expect(fetchMock).not.toHaveBeenCalled();
        expect(reply).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ msg_type: "text" }) }),
        );
        fetchMock.mockRestore();
    });

    it("saves a configuration without returning raw secrets", async () => {
        const { service, dictService } = makeService();
        const result = await service.save({
            agentId: "00000000-0000-4000-8000-000000000001",
            appId: "cli_1234567890abcdef",
            appSecret: "feishu-secret-value",
            agentAccessToken: "buildingai-agent-token",
            enabled: false,
        });

        expect(dictService.set).toHaveBeenCalledWith(
            "00000000-0000-4000-8000-000000000001",
            expect.objectContaining({
                appSecret: "feishu-secret-value",
                agentAccessToken: "buildingai-agent-token",
            }),
            expect.objectContaining({ group: "feishu-agent-channel" }),
        );
        expect(result.appId).toBe("cli_••••cdef");
        expect(result).not.toHaveProperty("appSecret");
        expect(result).not.toHaveProperty("agentAccessToken");
    });

    it("deduplicates an event before calling the agent", async () => {
        const { service, redisService } = makeService();
        const config = {
            agentId: "agent-1",
            appId: "cli_1234567890abcdef",
            appSecret: "secret",
            agentAccessToken: "token",
            enabled: true,
            onlyMentioned: false,
        };
        const reply = jest.fn().mockResolvedValue(undefined);
        const client = { im: { v1: { message: { reply } } } };
        const event = {
            event_id: "event-1",
            message: {
                message_id: "message-1",
                chat_id: "chat-1",
                chat_type: "p2p",
                message_type: "text",
                content: JSON.stringify({ text: "hello" }),
            },
        };
        const callAgent = jest.spyOn(service as any, "callAgentStreaming") as jest.Mock;
        callAgent.mockResolvedValue({ answer: "world", conversationId: "conversation-1" });

        await (service as any).handleEvent(config, client, event);
        await (service as any).handleEvent(config, client, event);

        expect(callAgent).toHaveBeenCalledTimes(1);
        expect(reply).toHaveBeenCalledTimes(1);
        expect(redisService.set).toHaveBeenCalledWith("feishu:event:agent-1:event-1", "1", 600);
    });

    it("maps the Feishu sender name to a Bowi AI user for the current turn", async () => {
        const previousSecret = process.env.BOWI_MCP_INVOCATION_SECRET;
        const previousDomain = process.env.APP_DOMAIN;
        process.env.BOWI_MCP_INVOCATION_SECRET = "feishu-test-secret";
        process.env.APP_DOMAIN = "https://ai.example.com";
        const userRepository = {
            findOne: jest.fn().mockResolvedValue({ id: "buildingai-user-1", nickname: "谭建" }),
        };
        const { service } = makeService();
        (service as any).userRepository = userRepository;
        const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
            new Response(`data: ${JSON.stringify({ type: "text-delta", delta: "answer" })}\n\n`, {
                status: 200,
                headers: { "content-type": "text/event-stream" },
            }),
        );
        const reply = jest.fn().mockResolvedValue(undefined);
        const contactGet = jest.fn().mockResolvedValue({ data: { user: { name: "谭建" } } });
        const client = {
            contact: { v3: { user: { get: contactGet } } },
            im: { v1: { message: { reply } } },
        };

        await (service as any).handleEvent(
            {
                agentId: "agent-1",
                connectionId: "connection-1",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: false,
            },
            client,
            {
                event_id: "mapped-user-event",
                sender: { sender_type: "user", sender_id: { open_id: "ou_user_1" } },
                message: {
                    message_id: "mapped-user-message",
                    chat_id: "chat-1",
                    chat_type: "p2p",
                    message_type: "text",
                    content: JSON.stringify({ text: "hello" }),
                },
            },
        );

        expect(contactGet).toHaveBeenCalledWith({
            path: { user_id: "ou_user_1" },
            params: { user_id_type: "open_id" },
        });
        const requestHeaders = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
        expect(requestHeaders["x-buildingai-feishu-identity"]).toEqual(expect.any(String));
        expect(JSON.parse(Buffer.from(requestHeaders["x-buildingai-feishu-identity"].split(".")[0], "base64url").toString("utf8"))).toEqual(
            expect.objectContaining({
                userId: "buildingai-user-1",
                agentId: "agent-1",
                authSource: "login",
            }),
        );
        fetchMock.mockRestore();
        if (previousSecret === undefined) delete process.env.BOWI_MCP_INVOCATION_SECRET;
        else process.env.BOWI_MCP_INVOCATION_SECRET = previousSecret;
        if (previousDomain === undefined) delete process.env.APP_DOMAIN;
        else process.env.APP_DOMAIN = previousDomain;
    });

    it("routes an unmentioned group scheduling intent to the automation interceptor", async () => {
        const { service } = makeService();
        const automationHandler = { handle: jest.fn().mockResolvedValue(true) };
        service.registerAutomationCommandHandler(automationHandler as never);
        const callAgent = jest.spyOn(service as any, "callAgentStreaming");

        await (service as any).handleEvent(
            {
                agentId: "agent-1",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: true,
            },
            { im: { v1: { message: { reply: jest.fn() } } } },
            {
                event_id: "automation-group-event",
                message: {
                    message_id: "automation-group-message",
                    chat_id: "oc-group-1",
                    chat_type: "group",
                    message_type: "text",
                    content: JSON.stringify({
                        text: "生成一个定时任务，每天7:25，给我发送当前公司的采购情况",
                    }),
                },
            },
        );

        expect(automationHandler.handle).toHaveBeenCalledWith(
            expect.anything(),
            expect.anything(),
            "生成一个定时任务，每天7:25，给我发送当前公司的采购情况",
            "automation-group-event",
        );
        expect(callAgent).not.toHaveBeenCalled();
    });

    it("does not treat ordinary unmentioned recurring-language chat as a reserved intent", async () => {
        const { service } = makeService();
        const automationHandler = { handle: jest.fn().mockResolvedValue(true) };
        service.registerAutomationCommandHandler(automationHandler as never);

        await (service as any).handleEvent(
            {
                agentId: "agent-1",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: true,
            },
            { im: { v1: { message: { reply: jest.fn() } } } },
            {
                event_id: "ordinary-group-event",
                message: {
                    message_id: "ordinary-group-message",
                    chat_id: "oc-group-1",
                    chat_type: "group",
                    message_type: "text",
                    content: JSON.stringify({ text: "每天销量是多少？" }),
                },
            },
        );

        expect(automationHandler.handle).not.toHaveBeenCalled();
    });

    it("streams agent SSE deltas into a Feishu card and finalizes it", async () => {
        const { service, redisService } = makeService();
        process.env.APP_DOMAIN = "https://ai.example.com/";
        const fetchMock = jest
            .spyOn(global, "fetch")
            .mockResolvedValue(
                new Response(
                    [
                        `data: ${JSON.stringify({ type: "text-delta", delta: "hello" })}`,
                        `data: ${JSON.stringify({ type: "text-delta", delta: " world" })}`,
                        `data: ${JSON.stringify({ type: "data-conversation-id", data: "conv-1" })}`,
                        "",
                    ].join("\n"),
                    { status: 200, headers: { "content-type": "text/event-stream" } },
                ),
            );
        const reply = jest.fn().mockResolvedValue(undefined);
        const cardCreate = jest.fn().mockResolvedValue({ data: { card_id: "card-1" } });
        const cardContent = jest.fn().mockResolvedValue(undefined);
        const cardSettings = jest.fn().mockResolvedValue(undefined);
        const client = {
            im: { v1: { message: { reply } } },
            cardkit: {
                v1: {
                    card: { create: cardCreate, settings: cardSettings },
                    cardElement: {
                        content: cardContent,
                        update: jest.fn().mockResolvedValue(undefined),
                    },
                },
            },
        };
        await (service as any).handleEvent(
            {
                agentId: "agent-1",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: false,
            },
            client,
            {
                event_id: "event-stream-1",
                message: {
                    message_id: "message-stream-1",
                    chat_id: "chat-1",
                    chat_type: "p2p",
                    message_type: "text",
                    content: JSON.stringify({ text: "hello" }),
                },
            },
        );

        expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(
            expect.objectContaining({ responseMode: "streaming" }),
        );
        expect(cardCreate).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ type: "card_json" }) }),
        );
        expect(reply).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ msg_type: "interactive" }),
            }),
        );
        expect(cardContent).toHaveBeenCalledWith(
            expect.objectContaining({
                path: { card_id: "card-1", element_id: "stream_md" },
                data: expect.objectContaining({
                    content: "hello world",
                    sequence: expect.any(Number),
                }),
            }),
        );
        expect(cardSettings).toHaveBeenCalledWith(
            expect.objectContaining({
                path: { card_id: "card-1" },
                data: expect.objectContaining({ sequence: expect.any(Number) }),
            }),
        );
        expect(redisService.set).toHaveBeenCalledWith(
            "feishu:conversation:agent-1:chat-1",
            "conv-1",
            60 * 60 * 24 * 30,
        );
        fetchMock.mockRestore();
    });

    it("falls back to a text reply when streaming-card APIs are unavailable", async () => {
        const { service } = makeService();
        process.env.APP_DOMAIN = "https://ai.example.com/";
        const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue(
            new Response(`data: ${JSON.stringify({ type: "text-delta", delta: "answer" })}\n\n`, {
                status: 200,
                headers: { "content-type": "text/event-stream" },
            }),
        );
        const reply = jest.fn().mockResolvedValue(undefined);
        const client = { im: { v1: { message: { reply } } } };
        await (service as any).handleEvent(
            {
                agentId: "agent-1",
                appId: "cli_1234567890abcdef",
                appSecret: "secret",
                agentAccessToken: "token",
                enabled: true,
                onlyMentioned: false,
            },
            client,
            {
                event_id: "event-fallback-1",
                message: {
                    message_id: "message-fallback-1",
                    chat_id: "chat-1",
                    chat_type: "p2p",
                    message_type: "text",
                    content: JSON.stringify({ text: "hello" }),
                },
            },
        );
        expect(reply).toHaveBeenCalledWith(
            expect.objectContaining({ data: expect.objectContaining({ msg_type: "text" }) }),
        );
        fetchMock.mockRestore();
    });

    it("releases the event claim when both processing and the fallback reply fail", async () => {
        const { service, redisService } = makeService();
        const callAgent = jest.spyOn(service as any, "callAgentStreaming") as jest.Mock;
        callAgent
            .mockRejectedValueOnce(new Error("upstream unavailable"))
            .mockResolvedValueOnce({ answer: "answer" });
        const reply = jest
            .fn()
            .mockRejectedValueOnce(new Error("Feishu reply unavailable"))
            .mockResolvedValue(undefined);
        const client = { im: { v1: { message: { reply } } } };
        const event = {
            event_id: "event-retry-1",
            message: {
                message_id: "message-retry-1",
                chat_id: "chat-1",
                chat_type: "p2p",
                message_type: "text",
                content: JSON.stringify({ text: "你能做什么" }),
            },
        };
        const config = {
            agentId: "agent-1",
            appId: "cli_1234567890abcdef",
            appSecret: "secret",
            agentAccessToken: "token",
            enabled: true,
            onlyMentioned: false,
        };

        await (service as any).handleEvent(config, client, event);
        await (service as any).handleEvent(config, client, event);

        expect(callAgent).toHaveBeenCalledTimes(2);
        expect(reply).toHaveBeenCalledTimes(2);
        expect(redisService.del).toHaveBeenCalledWith(
            "feishu:event:agent-1:event-retry-1",
        );
    });

    it("reports an invalid Feishu app ID instead of hanging in connecting", async () => {
        const { service } = makeService();
        const result = await service.save({
            agentId: "00000000-0000-4000-8000-000000000002",
            appId: "invalid-app-id",
            appSecret: "secret",
            agentAccessToken: "token",
            enabled: true,
        });
        expect(result.connectionState).toBe("error");
        expect(result.lastError).toContain("cli_<16 alphanumeric characters>");
    });

});
