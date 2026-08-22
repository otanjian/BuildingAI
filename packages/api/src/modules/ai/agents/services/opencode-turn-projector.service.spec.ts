jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));

import { OpencodeTurnProjectorService } from "./opencode-turn-projector.service";

const TURN_ID = "11111111-1111-4111-8111-111111111111";
const LEASE_TOKEN = "22222222-2222-4222-8222-222222222222";

function message(overrides: Record<string, unknown> = {}) {
    return {
        info: {
            id: "assistant-1",
            role: "assistant",
            parentID: "remote-user-1",
            ...overrides,
        },
        parts: [{ type: "text", text: "working" }],
    };
}

describe("OpencodeTurnProjectorService", () => {
    it("persists a non-terminal snapshot for exact assistant descendants", async () => {
        const repository = { recordLiveProjection: jest.fn(async () => ({ changed: true, version: "1" })) };
        const dataSource = {
            transaction: jest.fn(async (fn: (manager: unknown) => unknown) => fn({})),
        };
        const service = new OpencodeTurnProjectorService(
            dataSource as never,
            repository as never,
        );

        await expect(
            service.project({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                status: "running",
                remoteUserMessageId: "remote-user-1",
                messages: [message(), message({ id: "other", parentID: "another-user" })],
            }),
        ).resolves.toMatchObject({ changed: true, version: "1" });
        expect(repository.recordLiveProjection).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                projection: expect.objectContaining({
                    status: "running",
                    remoteAssistantMessageIds: ["assistant-1"],
                    parts: [{ type: "text", text: "working" }],
                }),
            }),
        );
    });

    it("returns no change until an exact visible descendant exists", async () => {
        const repository = { recordLiveProjection: jest.fn() };
        const service = new OpencodeTurnProjectorService(
            { transaction: jest.fn() } as never,
            repository as never,
        );
        await expect(
            service.project({
                turnId: TURN_ID,
                leaseToken: LEASE_TOKEN,
                status: "running",
                remoteUserMessageId: "remote-user-1",
                messages: [message({ parentID: "wrong" })],
            }),
        ).resolves.toEqual({ changed: false, version: null });
        expect(repository.recordLiveProjection).not.toHaveBeenCalled();
    });

    it("coalesces a burst and schedules one trailing refresh for mid-flight changes", async () => {
        jest.useFakeTimers();
        const refresh = jest.fn(async () => undefined);
        const service = new OpencodeTurnProjectorService(
            { transaction: jest.fn() } as never,
            { recordLiveProjection: jest.fn() } as never,
            { batchMs: 100 },
        );
        service.schedule(TURN_ID, refresh);
        service.schedule(TURN_ID, refresh);
        service.schedule(TURN_ID, refresh);
        await jest.advanceTimersByTimeAsync(100);
        expect(refresh).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(100);
        expect(refresh).toHaveBeenCalledTimes(2);
        jest.useRealTimers();
    });

    it("records content-free write, latency, and truncation telemetry", async () => {
        const repository = {
            recordLiveProjection: jest.fn(async () => ({
                changed: true,
                version: "2",
                turn: { liveProjection: { truncated: true } },
            })),
        };
        const telemetry = { increment: jest.fn(), observe: jest.fn() };
        const service = new OpencodeTurnProjectorService(
            { transaction: jest.fn(async (fn) => fn({})) } as never,
            repository as never,
            undefined,
            telemetry as never,
        );

        await service.project({
            turnId: TURN_ID,
            leaseToken: LEASE_TOKEN,
            status: "running",
            remoteUserMessageId: "remote-user-1",
            messages: [message()],
        });

        expect(telemetry.increment).toHaveBeenCalledWith("projection_write", {
            turnId: TURN_ID,
        });
        expect(telemetry.increment).toHaveBeenCalledWith("projection_truncation", {
            turnId: TURN_ID,
        });
        expect(telemetry.observe).toHaveBeenCalledWith(
            "projection_latency_ms",
            expect.any(Number),
            { turnId: TURN_ID, changed: true },
        );
        expect(JSON.stringify(telemetry.increment.mock.calls)).not.toContain("working");
    });
});
