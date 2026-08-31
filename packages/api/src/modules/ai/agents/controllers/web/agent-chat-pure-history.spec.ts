jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));
jest.mock("chalk", () => {
    const color = (value: unknown) => String(value);
    return { __esModule: true, default: new Proxy(color, { get: () => color }) };
});
jest.mock("uuid", () => ({ validate: () => true }));
jest.mock("@buildingai/decorators", () => ({ BuildFileUrl: () => () => undefined }));
jest.mock("@buildingai/decorators/playground.decorator", () => ({
    Playground: () => () => undefined,
}));
jest.mock(
    "@common/decorators/controller.decorator",
    () => ({
        WebController: () => (target: unknown) => target,
    }),
    { virtual: true },
);
jest.mock(
    "@common/decorators/agent-public-access.decorator",
    () => ({
        AgentPublicAccess: () => () => undefined,
    }),
    { virtual: true },
);
jest.mock("../../integrations/opencode-api.service", () => ({
    OpencodeApiService: class OpencodeApiService {},
}));
jest.mock("../../providers/opencode-chat.provider", () => ({
    OpencodeChatProvider: class OpencodeChatProvider {},
}));
jest.mock("../../services/agent-chat-completion.service", () => ({
    AgentChatCompletionService: class AgentChatCompletionService {},
}));
jest.mock("../../services/agent-chat-message.service", () => ({
    AgentChatMessageService: class AgentChatMessageService {},
}));
jest.mock("../../services/agent-chat-message-feedback.service", () => ({
    AgentChatMessageFeedbackService: class AgentChatMessageFeedbackService {},
}));
jest.mock("../../services/agent-chat-record.service", () => ({
    AgentChatRecordService: class AgentChatRecordService {},
}));
jest.mock("../../services/agent-voice.service", () => ({
    AgentVoiceService: class AgentVoiceService {},
}));
jest.mock("../../services/agents.service", () => ({
    AgentsService: class AgentsService {},
}));
jest.mock("../../services/opencode-artifact.service", () => ({
    OpencodeArtifactService: class OpencodeArtifactService {},
}));
jest.mock("../../services/opencode-workspace.service", () => ({
    OpencodeWorkspaceService: class OpencodeWorkspaceService {},
}));

import { AgentChatWebController } from "./agent-chat.controller";
import { createBowiInvocationAssertion } from "../../../../bowi-mcp/utils/bowi-invocation-assertion";

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

describe("AgentChatWebController pure Bowi AI history", () => {
    function harness() {
        const records = {
            getConversation: jest.fn(async (): Promise<any> => ({
                id: CONVERSATION_ID,
                agentId: AGENT_ID,
                userId: USER_ID,
                anonymousIdentifier: null,
                title: "Conversation",
                archivedAt: null,
                opencodeSessionId: "ses_embed",
                opencodeRuntimeHash: "runtime-hash",
                metadata: undefined,
            })),
            createConversation: jest.fn(async () => ({
                id: CONVERSATION_ID,
                agentId: AGENT_ID,
                userId: USER_ID,
                anonymousIdentifier: null,
                title: "新对话",
                archivedAt: null,
                opencodeSessionId: null,
                opencodeRuntimeHash: null,
                metadata: { provider: "opencode" },
            })),
            bindOpencodeSession: jest.fn(async (_conversationId, sessionId, runtimeHash) => ({
                id: CONVERSATION_ID,
                agentId: AGENT_ID,
                userId: USER_ID,
                anonymousIdentifier: null,
                title: "Conversation",
                archivedAt: null,
                opencodeSessionId: sessionId,
                opencodeRuntimeHash: runtimeHash,
                metadata: { provider: "opencode", opencodeSessionId: sessionId },
            })),
            listUserConversations: jest.fn(async () => ({ items: [], total: 0 })),
            findActiveOpencodeTurn: jest.fn(async () => null),
            getOpencodeTurnConversationProjection: jest.fn(async () => ({
                activeTurn: null,
                legacyStatus: null,
            })),
            isPlaceholderConversationTitle: jest.fn(
                (title?: string | null) => !title?.trim() || title.trim() === "新对话",
            ),
            syncGeneratedOpencodeTitle: jest.fn(
                async (_conversationId: string, title?: string) => title === "采购订单分析",
            ),
            initializeOpencodeIframeBilling: jest.fn(async () => ({
                version: 1,
                startedAt: "2026-08-23T04:00:00.000Z",
            })),
        };
        const messages = {
            listConversationMessages: jest.fn(async () => ({
                items: [{ id: "message-1" }],
                total: 1,
            })),
        };
        const opencodeApi = {
            getSessionStatus: jest.fn(() => new Promise(() => undefined)),
            listSessionMessages: jest.fn(() => new Promise(() => undefined)),
            approvePendingPermissions: jest.fn(() => new Promise(() => undefined)),
            abortSession: jest.fn(() => new Promise(() => undefined)),
            normalizeConfig: jest.fn(() => ({
                baseURL: "http://127.0.0.1:4096",
                workspace: "/tmp/opencode",
            })),
            createSession: jest.fn(async () => ({ id: "ses_embed" })),
            updateSessionMetadata: jest.fn(async () => ({ id: "ses_embed" })),
            deleteSession: jest.fn(async () => undefined),
            getSession: jest.fn(async () => ({
                id: "ses_embed",
                title: "New session - 2026-08-22T00:00:00.000Z",
            })),
        };
        const opencodeProvider = {
            stopTurn: jest.fn(() => new Promise(() => undefined)),
        };
        const userDict = {
            getGroupValues: jest.fn(async () => ({ sap链接参数: "conn=/H/sap" })),
        };
        const completion = { streamChat: jest.fn(async () => undefined) };
        const agents = {
            findOneById: jest.fn(async () => ({
                id: AGENT_ID,
                createMode: "opencode",
                thirdPartyIntegration: { extendedConfig: { durableTurnsEnabled: false } },
            })),
        };
        const controller = new AgentChatWebController(
            completion as any,
            {} as any,
            records as any,
            messages as any,
            {} as any,
            agents as any,
            opencodeApi as any,
            {} as any,
            {} as any,
            opencodeProvider as any,
            userDict as any,
        );
        return {
            controller,
            completion,
            records,
            messages,
            agents,
            opencodeApi,
            opencodeProvider,
            userDict,
        };
    }

    it("returns persisted messages without any OpenCode status/recovery/control call", async () => {
        const test = harness();
        await expect(
            test.controller.listConversationMessages(
                AGENT_ID,
                CONVERSATION_ID,
                {} as any,
                { id: USER_ID, username: "S2385" } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({ items: [{ id: "message-1" }] });

        expect(test.opencodeApi.getSessionStatus).not.toHaveBeenCalled();
        expect(test.opencodeApi.listSessionMessages).not.toHaveBeenCalled();
        expect(test.opencodeApi.approvePendingPermissions).not.toHaveBeenCalled();
        expect(test.opencodeApi.abortSession).not.toHaveBeenCalled();
        expect(test.opencodeProvider.stopTurn).not.toHaveBeenCalled();
    });

    it("creates one mapped OpenCode session for a new local conversation", async () => {
        const test = harness();
        test.records.getConversation.mockResolvedValueOnce(null);

        await expect(
            test.controller.getOpencodeEmbed(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID, username: "S2385" } as any,
                { headers: { origin: "http://127.0.0.1:4091" } } as any,
            ),
        ).resolves.toEqual({
            conversationId: CONVERSATION_ID,
            sessionId: "ses_embed",
            url: "http://127.0.0.1:4096/server/aHR0cDovLzEyNy4wLjAuMTo0MDk2/session/ses_embed?buildingaiEmbed=1&buildingaiReportBase=http%3A%2F%2F127.0.0.1%3A4091%2Fagents%2F11111111-1111-4111-8111-111111111111%2Fc%2F22222222-2222-4222-8222-222222222222%2Freports%2F&buildingaiArtifactRoot=artifacts%2F22222222-2222-4222-8222-222222222222",
            title: "新对话",
            titleSynced: false,
        });

        expect(test.opencodeApi.createSession).toHaveBeenCalledTimes(1);
        expect(test.opencodeApi.createSession).toHaveBeenCalledWith(expect.anything(), undefined, {
            useDefaultTitle: true,
            metadata: {
                "buildingai.systemContext": expect.stringMatching(
                    /login username: S2385[\s\S]*conn=\/H\/sap/,
                ),
            },
        });
        expect(test.records.bindOpencodeSession).toHaveBeenCalledWith(
            CONVERSATION_ID,
            "ses_embed",
            expect.any(String),
        );
        expect(test.records.initializeOpencodeIframeBilling).toHaveBeenCalledWith(CONVERSATION_ID);
        expect(test.opencodeApi.updateSessionMetadata).not.toHaveBeenCalled();
    });

    it("eventually synchronizes a generated OpenCode title after embed bootstrap", async () => {
        const test = harness();
        test.opencodeApi.getSession.mockResolvedValueOnce({
            id: "ses_embed",
            title: "采购订单分析",
        });
        test.records.getConversation.mockResolvedValueOnce({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: null,
            title: "新对话",
            archivedAt: null,
            opencodeSessionId: "ses_embed",
            opencodeRuntimeHash: "runtime-hash",
            metadata: { provider: "opencode", opencodeSessionId: "ses_embed" },
        });

        await expect(
            test.controller.getOpencodeEmbed(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID, username: "S2385" } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({ title: "新对话", titleSynced: false });

        expect(test.opencodeApi.getSession).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: "ses_embed" }),
        );
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(test.records.syncGeneratedOpencodeTitle).toHaveBeenCalledWith(
            CONVERSATION_ID,
            "采购订单分析",
        );
        expect(test.opencodeApi.updateSessionMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                sessionId: "ses_embed",
                metadata: {
                    "buildingai.systemContext": expect.stringMatching(
                        /artifacts\/22222222-2222-4222-8222-222222222222[\s\S]*cite every generated `\.html` or `\.htm` file/i,
                    ),
                },
            }),
        );
    });

    it("returns an existing-session embed before metadata refresh completes", async () => {
        const test = harness();
        let releaseMetadata!: (value: { id: string }) => void;
        test.opencodeApi.updateSessionMetadata.mockReturnValueOnce(
            new Promise((resolve) => {
                releaseMetadata = resolve;
            }),
        );

        let settled = false;
        const responsePromise = test.controller.getOpencodeEmbed(
            AGENT_ID,
            CONVERSATION_ID,
            { id: USER_ID, username: "S2385" } as any,
            { headers: {} } as any,
        );
        void responsePromise.then(() => {
            settled = true;
        });

        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(settled).toBe(true);
        await expect(responsePromise).resolves.toMatchObject({
            sessionId: "ses_embed",
            title: "Conversation",
            titleSynced: false,
        });

        releaseMetadata({ id: "ses_embed" });
        await new Promise<void>((resolve) => setImmediate(resolve));
    });

    it("returns a placeholder title before generated-title lookup completes", async () => {
        const test = harness();
        let releaseTitleLookup!: (value: { id: string; title: string }) => void;
        test.opencodeApi.getSession.mockReturnValueOnce(
            new Promise((resolve) => {
                releaseTitleLookup = resolve;
            }),
        );
        test.records.getConversation.mockResolvedValueOnce({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: null,
            title: "新对话",
            archivedAt: null,
            opencodeSessionId: "ses_embed",
            opencodeRuntimeHash: "runtime-hash",
            metadata: { provider: "opencode", opencodeSessionId: "ses_embed" },
        });

        let settled = false;
        const responsePromise = test.controller.getOpencodeEmbed(
            AGENT_ID,
            CONVERSATION_ID,
            { id: USER_ID, username: "S2385" } as any,
            { headers: {} } as any,
        );
        void responsePromise.then(() => {
            settled = true;
        });

        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(settled).toBe(true);
        await expect(responsePromise).resolves.toMatchObject({
            sessionId: "ses_embed",
            title: "新对话",
            titleSynced: false,
        });

        releaseTitleLookup({ id: "ses_embed", title: "采购订单分析" });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(test.records.syncGeneratedOpencodeTitle).toHaveBeenCalledWith(
            CONVERSATION_ID,
            "采购订单分析",
        );
    });

    it("keeps bootstrap successful when optional enrichment fails", async () => {
        const test = harness();
        test.opencodeApi.updateSessionMetadata.mockRejectedValueOnce(
            new Error("PATCH unsupported"),
        );
        test.opencodeApi.getSession.mockRejectedValueOnce(new Error("GET unavailable"));
        test.records.getConversation.mockResolvedValueOnce({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: null,
            title: "新对话",
            archivedAt: null,
            opencodeSessionId: "ses_embed",
            opencodeRuntimeHash: "runtime-hash",
            metadata: { provider: "opencode", opencodeSessionId: "ses_embed" },
        });

        await expect(
            test.controller.getOpencodeEmbed(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID, username: "S2385" } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({ title: "新对话", titleSynced: false });

        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(test.opencodeApi.updateSessionMetadata).toHaveBeenCalledTimes(1);
        expect(test.opencodeApi.getSession).toHaveBeenCalledTimes(1);
        expect(test.records.syncGeneratedOpencodeTitle).not.toHaveBeenCalled();
    });

    it("deduplicates enrichment while an embed request is still pending", async () => {
        const test = harness();
        let releaseMetadata!: (value: { id: string }) => void;
        test.opencodeApi.updateSessionMetadata.mockReturnValueOnce(
            new Promise((resolve) => {
                releaseMetadata = resolve;
            }),
        );

        const first = test.controller.getOpencodeEmbed(
            AGENT_ID,
            CONVERSATION_ID,
            { id: USER_ID, username: "S2385" } as any,
            { headers: {} } as any,
        );
        const second = test.controller.getOpencodeEmbed(
            AGENT_ID,
            CONVERSATION_ID,
            { id: USER_ID, username: "S2385" } as any,
            { headers: {} } as any,
        );

        await expect(Promise.all([first, second])).resolves.toHaveLength(2);
        expect(test.opencodeApi.updateSessionMetadata).toHaveBeenCalledTimes(1);

        releaseMetadata({ id: "ses_embed" });
        await new Promise<void>((resolve) => setImmediate(resolve));
    });

    it("does not overwrite a meaningful Bowi AI title from OpenCode", async () => {
        const test = harness();

        await test.controller.getOpencodeEmbed(
            AGENT_ID,
            CONVERSATION_ID,
            { id: USER_ID, username: "S2385" } as any,
            { headers: {} } as any,
        );

        expect(test.opencodeApi.getSession).not.toHaveBeenCalled();
        expect(test.records.syncGeneratedOpencodeTitle).not.toHaveBeenCalled();
    });

    it("returns conversation list and detail from Bowi AI while OpenCode is unavailable", async () => {
        const test = harness();
        await expect(
            test.controller.listConversations(
                AGENT_ID,
                {} as any,
                { id: USER_ID } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({ items: [] });
        await expect(
            test.controller.getConversationDetail(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID } as any,
                { headers: {} } as any,
            ),
        ).resolves.toEqual({
            id: CONVERSATION_ID,
            title: "Conversation",
            archivedAt: null,
            metadata: undefined,
            activeTurn: null,
        });
        expect(test.opencodeApi.getSessionStatus).not.toHaveBeenCalled();
        expect(test.opencodeApi.listSessionMessages).not.toHaveBeenCalled();
    });

    it("rejects the legacy conversation Stop while a durable turn owns cancellation", async () => {
        const test = harness();
        test.records.findActiveOpencodeTurn.mockResolvedValue({
            id: "44444444-4444-4444-8444-444444444444",
            status: "running",
        });

        await expect(
            test.controller.stopConversationTurn(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID } as any,
                { headers: {} } as any,
            ),
        ).rejects.toThrow(/turn 44444444-4444-4444-8444-444444444444/i);
        expect(test.opencodeProvider.stopTurn).not.toHaveBeenCalled();
    });

    it("returns the durable active-turn summary in an archived conversation detail", async () => {
        const test = harness();
        test.records.getConversation.mockResolvedValue({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: null,
            title: "Archived conversation",
            archivedAt: new Date("2026-08-20T10:00:00.000Z"),
        });
        test.records.getOpencodeTurnConversationProjection.mockResolvedValue({
            activeTurn: {
                turnId: "55555555-5555-4555-8555-555555555555",
                status: "running",
                lastActivityAt: new Date("2026-08-20T10:01:00.000Z"),
                cancelRequested: false,
            },
            legacyStatus: "running",
        });

        await expect(
            test.controller.getConversationDetail(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({
            id: CONVERSATION_ID,
            activeTurn: {
                turnId: "55555555-5555-4555-8555-555555555555",
                status: "running",
            },
        });
    });

    it("does not expose a conversation to a different anonymous owner", async () => {
        const test = harness();
        test.records.getConversation.mockResolvedValue({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: null,
            anonymousIdentifier: "anonymous-owner",
            title: "Anonymous conversation",
            archivedAt: null,
        });

        await expect(
            test.controller.getConversationDetail(
                AGENT_ID,
                CONVERSATION_ID,
                { id: null } as any,
                { headers: { "x-anonymous-identifier": "different-owner" } } as any,
            ),
        ).rejects.toThrow(/无权/);
        expect(test.records.getOpencodeTurnConversationProjection).not.toHaveBeenCalled();
    });

    it("returns an active-turn summary to the matching anonymous owner", async () => {
        const test = harness();
        test.records.getConversation.mockResolvedValue({
            id: CONVERSATION_ID,
            agentId: AGENT_ID,
            userId: USER_ID,
            anonymousIdentifier: "anonymous-owner",
            title: "Anonymous conversation",
            archivedAt: null,
        });
        test.records.getOpencodeTurnConversationProjection.mockResolvedValue({
            activeTurn: {
                turnId: "55555555-5555-4555-8555-555555555555",
                status: "accepted",
                lastActivityAt: new Date("2026-08-20T10:01:00.000Z"),
                cancelRequested: false,
            },
            legacyStatus: "running",
        });

        await expect(
            test.controller.getConversationDetail(
                AGENT_ID,
                CONVERSATION_ID,
                { id: USER_ID } as any,
                { headers: { "x-anonymous-identifier": "anonymous-owner" } } as any,
            ),
        ).resolves.toMatchObject({ activeTurn: { status: "accepted" } });
    });

    it("rejects the legacy stream when the durable agent path owns new requests", async () => {
        const test = harness();
        test.agents.findOneById.mockResolvedValue({
            id: AGENT_ID,
            createMode: "opencode",
            thirdPartyIntegration: { extendedConfig: { durableTurnsEnabled: true } },
        });
        const response = {
            writableEnded: false,
            on: jest.fn(),
        };
        const request = {
            headers: {},
            on: jest.fn(),
            aborted: false,
            socket: { destroyed: false },
        };

        await expect(
            test.controller.streamChat(
                AGENT_ID,
                { messages: [{ role: "user", parts: [{ type: "text", text: "hello" }] }] } as any,
                { id: USER_ID } as any,
                response as any,
                request as any,
            ),
        ).rejects.toThrow(/durable.*turn/i);
        expect(test.completion.streamChat).not.toHaveBeenCalled();
    });

    it("collects blocking UI message streams before returning the public response", async () => {
        const test = harness();
        test.agents.findOneById.mockResolvedValue({
            id: AGENT_ID,
            createMode: "direct",
            thirdPartyIntegration: { extendedConfig: { durableTurnsEnabled: false } },
        } as any);
        (test.completion.streamChat as jest.Mock).mockImplementation(
            async (_params: any, response: any) => {
                response.write(`data: ${JSON.stringify({ type: "text-delta", delta: "hello" })}\n`);
                response.write(
                    `data: ${JSON.stringify({ type: "text-delta", delta: " world" })}\n\n`,
                );
                response.write(
                    `data: ${JSON.stringify({ type: "data-conversation-id", data: CONVERSATION_ID })}\n\n`,
                );
                response.end();
            },
        );
        const response = { json: jest.fn() };

        await test.controller.streamChat(
            AGENT_ID,
            {
                responseMode: "blocking",
                message: { role: "user", parts: [{ type: "text", text: "hi" }] },
            } as any,
            { id: USER_ID } as any,
            response as any,
            { headers: {} } as any,
        );

        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                answer: "hello world",
                conversationId: CONVERSATION_ID,
            }),
        );
    });

    it("passes a signed Feishu user identity to MCP without changing chat ownership", async () => {
        const test = harness();
        process.env.BOWI_MCP_INVOCATION_SECRET = "feishu-test-secret";
        test.agents.findOneById.mockResolvedValue({
            id: AGENT_ID,
            createMode: "direct",
            thirdPartyIntegration: { extendedConfig: { durableTurnsEnabled: false } },
        } as any);
        (test.completion.streamChat as jest.Mock).mockImplementation(
            async (_params: any, response: any) => response.end(),
        );
        const response = { json: jest.fn() };
        const assertion = createBowiInvocationAssertion({
            userId: "buildingai-user-1",
            agentId: AGENT_ID,
            conversationId: "chat-1",
            authSource: "login",
            capabilities: ["automation.personal"],
            automationScope: {
                channel: "feishu",
                accountId: "connection-1",
                conversationId: "chat-1",
                targetType: "chat",
                targetId: "chat-1",
            },
        });

        await test.controller.streamChat(
            AGENT_ID,
            {
                responseMode: "blocking",
                message: { role: "user", parts: [{ type: "text", text: "当前有哪些定时任务？" }] },
            } as any,
            { id: USER_ID } as any,
            response as any,
            {
                headers: {
                    "x-anonymous-identifier": "feishu:connection-1:chat-1",
                    "x-buildingai-feishu-identity": assertion,
                },
            } as any,
        );

        expect(test.completion.streamChat).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: USER_ID,
                mcpUserId: "buildingai-user-1",
                mcpAuthSource: "login",
                mcpAutomationScope: expect.objectContaining({ targetId: "chat-1" }),
            }),
            expect.anything(),
        );
    });

    it("rejects legacy streaming for an active durable conversation after flag rollback", async () => {
        const test = harness();
        test.records.findActiveOpencodeTurn.mockResolvedValue({
            id: "55555555-5555-4555-8555-555555555555",
            status: "running",
        });
        const response = { writableEnded: false, on: jest.fn() };
        const request = {
            headers: {},
            on: jest.fn(),
            aborted: false,
            socket: { destroyed: false },
        };

        await expect(
            test.controller.streamChat(
                AGENT_ID,
                {
                    conversationId: CONVERSATION_ID,
                    messages: [{ role: "user", parts: [{ type: "text", text: "hello" }] }],
                } as any,
                { id: USER_ID } as any,
                response as any,
                request as any,
            ),
        ).rejects.toThrow(/active.*turn.*55555555/i);
        expect(test.completion.streamChat).not.toHaveBeenCalled();
    });

    it("returns an explicit unsupported response for durable regeneration", async () => {
        const test = harness();
        test.agents.findOneById.mockResolvedValue({
            id: AGENT_ID,
            createMode: "opencode",
            thirdPartyIntegration: { extendedConfig: { durableTurnsEnabled: true } },
        });

        await expect(
            test.controller.streamChat(
                AGENT_ID,
                {
                    trigger: "regenerate-message",
                    messageId: "66666666-6666-4666-8666-666666666666",
                    messages: [],
                } as any,
                { id: USER_ID } as any,
                { writableEnded: false, on: jest.fn() } as any,
                {
                    headers: {},
                    on: jest.fn(),
                    aborted: false,
                    socket: { destroyed: false },
                } as any,
            ),
        ).rejects.toThrow(/regeneration.*unsupported/i);
        expect(test.completion.streamChat).not.toHaveBeenCalled();
    });
});
