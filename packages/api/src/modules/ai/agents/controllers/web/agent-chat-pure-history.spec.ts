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
jest.mock("@common/decorators/controller.decorator", () => ({
    WebController: () => (target: unknown) => target,
}), { virtual: true });
jest.mock("@common/decorators/agent-public-access.decorator", () => ({
    AgentPublicAccess: () => () => undefined,
}), { virtual: true });
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

const AGENT_ID = "11111111-1111-4111-8111-111111111111";
const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";

describe("AgentChatWebController pure BuildingAI history", () => {
    function harness() {
        const records = {
            getConversation: jest.fn(async () => ({
                id: CONVERSATION_ID,
                agentId: AGENT_ID,
                userId: USER_ID,
                anonymousIdentifier: null,
                title: "Conversation",
                archivedAt: null,
            })),
            listUserConversations: jest.fn(async () => ({ items: [], total: 0 })),
            findActiveOpencodeTurn: jest.fn(async () => null),
            getActiveOpencodeTurnSummary: jest.fn(async () => null),
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
        };
        const opencodeProvider = {
            stopTurn: jest.fn(() => new Promise(() => undefined)),
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
        );
        return { controller, completion, records, messages, agents, opencodeApi, opencodeProvider };
    }

    it("returns persisted messages without any OpenCode status/recovery/control call", async () => {
        const test = harness();
        await expect(
            test.controller.listConversationMessages(
                AGENT_ID,
                CONVERSATION_ID,
                {} as any,
                { id: USER_ID } as any,
                { headers: {} } as any,
            ),
        ).resolves.toMatchObject({ items: [{ id: "message-1" }] });

        expect(test.opencodeApi.getSessionStatus).not.toHaveBeenCalled();
        expect(test.opencodeApi.listSessionMessages).not.toHaveBeenCalled();
        expect(test.opencodeApi.approvePendingPermissions).not.toHaveBeenCalled();
        expect(test.opencodeApi.abortSession).not.toHaveBeenCalled();
        expect(test.opencodeProvider.stopTurn).not.toHaveBeenCalled();
    });

    it("returns conversation list and detail from BuildingAI while OpenCode is unavailable", async () => {
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
        test.records.getActiveOpencodeTurnSummary.mockResolvedValue({
            turnId: "55555555-5555-4555-8555-555555555555",
            status: "running",
            lastActivityAt: new Date("2026-08-20T10:01:00.000Z"),
            cancelRequested: false,
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
        expect(test.records.getActiveOpencodeTurnSummary).not.toHaveBeenCalled();
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
        test.records.getActiveOpencodeTurnSummary.mockResolvedValue({
            turnId: "55555555-5555-4555-8555-555555555555",
            status: "accepted",
            lastActivityAt: new Date("2026-08-20T10:01:00.000Z"),
            cancelRequested: false,
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
