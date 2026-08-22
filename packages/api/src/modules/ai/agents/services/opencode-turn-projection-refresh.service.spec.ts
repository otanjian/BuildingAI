jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));

import { OpencodeTurnProjectionRefreshService } from "./opencode-turn-projection-refresh.service";

describe("OpencodeTurnProjectionRefreshService", () => {
    it("coalesces an event into an exact lease-fenced session projection", async () => {
        let refresh: (() => Promise<unknown>) | undefined;
        const turn = {
            id: "turn-1",
            status: "running",
            leaseToken: "lease-1",
            opencodeUserMessageId: "remote-user-1",
            conversation: {
                opencodeSessionId: "session-1",
                agent: {
                    thirdPartyIntegration: { provider: "opencode" },
                    sensitiveWordConfig: { enabled: false },
                },
            },
        };
        const dataSource = { manager: { findOne: jest.fn(async () => turn) } };
        const api = {
            listRecentSessionMessages: jest.fn(async () => [
                { info: { id: "assistant-1", role: "assistant", parentID: "remote-user-1" } },
            ]),
        };
        const projector = {
            schedule: jest.fn((_turnId, callback) => {
                refresh = callback;
            }),
            project: jest.fn(async () => ({ changed: true, version: "2" })),
        };
        const service = new OpencodeTurnProjectionRefreshService(
            dataSource as never,
            api as never,
            projector as never,
        );

        service.notify("turn-1");
        expect(projector.schedule).toHaveBeenCalledWith("turn-1", expect.any(Function));
        await refresh?.();
        expect(api.listRecentSessionMessages).toHaveBeenCalledWith(
            expect.objectContaining({ sessionId: "session-1", limit: 50 }),
        );
        expect(projector.project).toHaveBeenCalledWith(
            expect.objectContaining({
                turnId: "turn-1",
                leaseToken: "lease-1",
                status: "running",
                remoteUserMessageId: "remote-user-1",
            }),
        );
    });

    it("ignores terminal or currently unleased turns", async () => {
        const dataSource = {
            manager: {
                findOne: jest
                    .fn()
                    .mockResolvedValueOnce({ id: "turn-1", status: "completed" })
                    .mockResolvedValueOnce({ id: "turn-2", status: "running", leaseToken: null }),
            },
        };
        const api = { listRecentSessionMessages: jest.fn() };
        const projector = {
            schedule: jest.fn((_turnId, callback) => void callback()),
            project: jest.fn(),
        };
        const service = new OpencodeTurnProjectionRefreshService(
            dataSource as never,
            api as never,
            projector as never,
        );

        service.notify("turn-1");
        service.notify("turn-2");
        await Promise.resolve();
        await Promise.resolve();
        expect(api.listRecentSessionMessages).not.toHaveBeenCalled();
        expect(projector.project).not.toHaveBeenCalled();
    });
});
