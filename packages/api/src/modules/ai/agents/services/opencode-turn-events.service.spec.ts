jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));

import { OpencodeTurnEventsService } from "./opencode-turn-events.service";

const TURN_ID = "11111111-1111-4111-8111-111111111111";

function activeTurn(overrides: Record<string, unknown> = {}) {
    return {
        id: TURN_ID,
        conversationId: "22222222-2222-4222-8222-222222222222",
        status: "running",
        assistantMessageId: null,
        liveProjection: { status: "running", parts: [{ type: "text", text: "hello" }] },
        projectionVersion: "4",
        projectionUpdatedAt: new Date("2026-08-21T10:00:00.000Z"),
        conversation: {
            agentId: "33333333-3333-4333-8333-333333333333",
            userId: "44444444-4444-4444-8444-444444444444",
            anonymousIdentifier: null,
        },
        ...overrides,
    };
}

describe("OpencodeTurnEventsService", () => {
    it("returns only a projection newer than the caller cursor", async () => {
        const repository = { findOne: jest.fn(async () => activeTurn()) };
        const service = new OpencodeTurnEventsService(repository as never);
        await expect(
            service.read({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                userId: activeTurn().conversation.userId,
                lastEventId: "3",
            }),
        ).resolves.toMatchObject({ type: "projection", id: "4" });
        await expect(
            service.read({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                userId: activeTurn().conversation.userId,
                lastEventId: "4",
            }),
        ).resolves.toBeNull();
    });

    it("returns one terminal event after durable commit", async () => {
        const repository = {
            findOne: jest.fn(async () =>
                activeTurn({
                    status: "completed",
                    assistantMessageId: "55555555-5555-4555-8555-555555555555",
                    liveProjection: null,
                    projectionUpdatedAt: null,
                }),
            ),
        };
        const service = new OpencodeTurnEventsService(repository as never);
        await expect(
            service.read({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                userId: activeTurn().conversation.userId,
                lastEventId: "4",
            }),
        ).resolves.toEqual({
            type: "terminal",
            id: "terminal:4",
            data: {
                conversationId: activeTurn().conversationId,
                turnId: TURN_ID,
                status: "completed",
                assistantMessageId: "55555555-5555-4555-8555-555555555555",
            },
        });
    });

    it("rejects cross-agent, user, and anonymous access", async () => {
        const repository = { findOne: jest.fn(async () => activeTurn()) };
        const service = new OpencodeTurnEventsService(repository as never);
        await expect(
            service.read({ agentId: "wrong", turnId: TURN_ID, userId: activeTurn().conversation.userId }),
        ).rejects.toThrow(/not found/i);
        await expect(
            service.read({ agentId: activeTurn().conversation.agentId, turnId: TURN_ID, userId: "wrong" }),
        ).rejects.toThrow(/access denied/i);
        await expect(
            service.read({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                userId: activeTurn().conversation.userId,
                anonymousIdentifier: "wrong",
            }),
        ).rejects.toThrow(/access denied/i);
    });

    it("requires the exact anonymous owner header", async () => {
        const repository = {
            findOne: jest.fn(async () =>
                activeTurn({
                    conversation: {
                        ...activeTurn().conversation,
                        userId: null,
                        anonymousIdentifier: "anonymous-owner",
                    },
                }),
            ),
        };
        const service = new OpencodeTurnEventsService(repository as never);

        await expect(
            service.read({ agentId: activeTurn().conversation.agentId, turnId: TURN_ID }),
        ).rejects.toThrow(/access denied/i);
        await expect(
            service.read({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                anonymousIdentifier: "anonymous-owner",
            }),
        ).resolves.toMatchObject({ type: "projection" });
    });

    it("watches the bound runtime session and accelerates reconciliation", async () => {
        let invalidate: (() => void | Promise<void>) | undefined;
        const repository = {
            findOne: jest.fn(async () =>
                activeTurn({
                    conversation: {
                        ...activeTurn().conversation,
                        opencodeSessionId: "session-a",
                        agent: { thirdPartyIntegration: { provider: "opencode" } },
                    },
                }),
            ),
        };
        const cleanup = jest.fn();
        const hub = {
            watch: jest.fn((input) => {
                invalidate = input.onEvent;
                return cleanup;
            }),
        };
        const reconciler = { tick: jest.fn(async () => undefined) };
        const service = new OpencodeTurnEventsService(
            repository as never,
            hub as never,
            reconciler as never,
        );
        const onInvalidate = jest.fn();

        const unwatch = await service.subscribe({
            agentId: activeTurn().conversation.agentId,
            turnId: TURN_ID,
            userId: activeTurn().conversation.userId,
            onInvalidate,
        });
        expect(hub.watch).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: "session-a", onEvent: expect.any(Function) }),
        );

        await invalidate?.();
        expect(onInvalidate).toHaveBeenCalledTimes(1);
        expect(reconciler.tick).toHaveBeenCalledTimes(1);
        unwatch();
        expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it("reports an unbound active session so the SSE controller can retry", async () => {
        const repository = {
            findOne: jest.fn(async () =>
                activeTurn({
                    conversation: {
                        ...activeTurn().conversation,
                        opencodeSessionId: null,
                        agent: { thirdPartyIntegration: { provider: "opencode" } },
                    },
                }),
            ),
        };
        const hub = { watch: jest.fn() };
        const service = new OpencodeTurnEventsService(repository as never, hub as never);

        await expect(
            service.subscribe({
                agentId: activeTurn().conversation.agentId,
                turnId: TURN_ID,
                userId: activeTurn().conversation.userId,
                onInvalidate: jest.fn(),
            }),
        ).resolves.toBeNull();
        expect(hub.watch).not.toHaveBeenCalled();
    });
});
