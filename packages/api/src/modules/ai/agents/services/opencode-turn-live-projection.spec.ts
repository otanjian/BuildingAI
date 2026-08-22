jest.mock("callsites", () => ({
    __esModule: true,
    default: () => [],
}));

import { AgentOpencodeTurn } from "@buildingai/db/entities";

import {
    sanitizeOpencodeLiveProjection,
    type OpencodeLiveProjectionInput,
} from "./opencode-turn-live-projection";
import { OpencodeTurnRepository } from "./opencode-turn.repository";

const TURN_ID = "11111111-1111-4111-8111-111111111111";
const LEASE_TOKEN = "22222222-2222-4222-8222-222222222222";

function turn(overrides: Partial<AgentOpencodeTurn> = {}): AgentOpencodeTurn {
    return {
        id: TURN_ID,
        status: "running",
        dispatchSnapshot: { prompt: "redacted" },
        artifactBaseline: { files: [] },
        assistantMessageId: null,
        completedAt: null,
        cancelRequestedAt: null,
        leaseToken: LEASE_TOKEN,
        leaseExpiresAt: new Date("2026-08-21T12:00:00.000Z"),
        remoteEvidenceHash: "evidence",
        liveProjection: null,
        projectionVersion: "0",
        projectionUpdatedAt: null,
        ...overrides,
    } as AgentOpencodeTurn;
}

function manager(entity: AgentOpencodeTurn) {
    return {
        findOne: jest.fn(async () => entity),
        save: jest.fn(async (_target: unknown, value: AgentOpencodeTurn) => value),
    };
}

function projection(parts: Array<Record<string, unknown>>): OpencodeLiveProjectionInput {
    return {
        status: "running",
        parts,
        remoteAssistantMessageIds: ["msg-assistant"],
    };
}

describe("OpenCode live projection", () => {
    it("bounds text and tool output without losing tool identity", () => {
        const result = sanitizeOpencodeLiveProjection(
            projection([
                { type: "text", text: "x".repeat(20_000) },
                {
                    type: "dynamic-tool",
                    toolCallId: "tool-1",
                    toolName: "bash",
                    state: "output-available",
                    input: { command: "pnpm test" },
                    output: "y".repeat(20_000),
                },
            ]),
            { maxTextChars: 1_000, maxToolOutputChars: 2_000 },
        );

        expect(String(result.parts[0].text)).toHaveLength(1_000);
        expect(String(result.parts[0].text).endsWith("… [truncated]")).toBe(true);
        expect(result.parts[1]).toMatchObject({
            toolCallId: "tool-1",
            toolName: "bash",
            truncated: true,
        });
        expect(String(result.parts[1].output)).toHaveLength(2_000);
        expect(String(result.parts[1].output).endsWith("… [truncated]")).toBe(true);
    });

    it("writes a lease-fenced projection with a monotonic version", async () => {
        const entity = turn();
        const db = manager(entity);
        const repository = new OpencodeTurnRepository();
        const at = new Date("2026-08-21T10:00:00.000Z");

        await expect(
            repository.recordLiveProjection(db as never, {
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                projection: projection([{ type: "text", text: "hello" }]),
                updatedAt: at,
            }),
        ).resolves.toMatchObject({ changed: true, version: "1" });
        expect(db.save).toHaveBeenCalledWith(
            AgentOpencodeTurn,
            expect.objectContaining({
                projectionVersion: "1",
                projectionUpdatedAt: at,
                liveProjection: expect.objectContaining({
                    parts: [{ type: "text", text: "hello" }],
                }),
            }),
        );
    });

    it("persists and clears a refresh-safe pending question without losing parts", async () => {
        const entity = turn({
            liveProjection: sanitizeOpencodeLiveProjection(
                projection([{ type: "text", text: "thinking" }]),
            ),
        });
        const db = manager(entity);
        const repository = new OpencodeTurnRepository();
        await repository.recordPendingQuestion(db as never, {
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
            pendingQuestion: {
                requestId: "que_1",
                sessionId: "ses_1",
                questions: [
                    {
                        header: "Company",
                        question: "Pick one",
                        options: [{ label: "Bowi", description: "Real data" }],
                        multiple: false,
                        custom: true,
                    },
                ],
            },
        });
        expect(entity.liveProjection).toMatchObject({
            parts: [{ type: "text", text: "thinking" }],
            pendingQuestion: { requestId: "que_1" },
        });
        await repository.recordPendingQuestion(db as never, {
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
            pendingQuestion: null,
        });
        expect(entity.liveProjection?.pendingQuestion).toBeNull();
    });

    it("does not increment the version for an identical sanitized snapshot", async () => {
        const existing = sanitizeOpencodeLiveProjection(
            projection([{ type: "text", text: "same" }]),
        );
        const entity = turn({ liveProjection: existing, projectionVersion: "7" });
        const db = manager(entity);

        await expect(
            new OpencodeTurnRepository().recordLiveProjection(db as never, {
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                projection: projection([{ type: "text", text: "same" }]),
            }),
        ).resolves.toEqual({ changed: false, version: "7", turn: entity });
        expect(db.save).not.toHaveBeenCalled();
    });

    it("rejects stale leases and terminal turns", async () => {
        const repository = new OpencodeTurnRepository();
        await expect(
            repository.recordLiveProjection(manager(turn()) as never, {
                turnId: TURN_ID,
                leaseToken: "wrong",
                projection: projection([{ type: "text", text: "no" }]),
            }),
        ).rejects.toThrow(/lease/i);
        await expect(
            repository.recordLiveProjection(
                manager(
                    turn({
                        status: "completed",
                        leaseToken: null,
                        leaseExpiresAt: null,
                        dispatchSnapshot: null,
                        artifactBaseline: null,
                    }),
                ) as never,
                {
                    turnId: TURN_ID,
                    leaseToken: LEASE_TOKEN,
                    projection: projection([{ type: "text", text: "no" }]),
                },
            ),
        ).rejects.toThrow(/active/i);
    });
});
