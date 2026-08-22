jest.mock("callsites", () => ({ __esModule: true, default: () => [] }));

import { OpencodeRuntimeEventHubService } from "./opencode-runtime-event-hub.service";

const runtime = {
    provider: "opencode" as const,
    baseURL: "http://127.0.0.1:4096",
    workspace: "/workspace",
    artifactDirTemplate: "artifacts/{conversationId}",
    useExternalConversation: true,
};

describe("OpencodeRuntimeEventHubService", () => {
    it("shares one upstream connection and routes exact sessions", async () => {
        let onEvent: ((event: Record<string, any>) => Promise<void> | void) | undefined;
        const api = {
            normalizeConfig: jest.fn(() => runtime),
            streamEvents: jest.fn(async (input) => {
                onEvent = input.onEvent;
                await new Promise<void>((resolve) => input.signal.addEventListener("abort", () => resolve()));
            }),
        };
        const telemetry = { increment: jest.fn(), gauge: jest.fn() };
        const hub = new OpencodeRuntimeEventHubService(api as never, telemetry as never, {
            idleGraceMs: 0,
            retryBaseMs: 10,
            retryMaxMs: 20,
        });
        const sessionA = jest.fn();
        const sessionB = jest.fn();
        const unwatchA = hub.watch({ config: runtime as never, sessionId: "session-a", onEvent: sessionA });
        const unwatchB = hub.watch({ config: runtime as never, sessionId: "session-b", onEvent: sessionB });
        await Promise.resolve();
        expect(api.streamEvents).toHaveBeenCalledTimes(1);

        await onEvent?.({ type: "message.updated", properties: { sessionID: "session-a" } });
        expect(sessionA).toHaveBeenCalledTimes(1);
        expect(sessionB).not.toHaveBeenCalled();

        unwatchA();
        unwatchB();
        await new Promise((resolve) => setTimeout(resolve, 0));
        await hub.onModuleDestroy();
    });

    it("ignores events without exact session identity", async () => {
        let onEvent: ((event: Record<string, any>) => Promise<void> | void) | undefined;
        const api = {
            normalizeConfig: jest.fn(() => runtime),
            streamEvents: jest.fn(async (input) => {
                onEvent = input.onEvent;
                await new Promise<void>((resolve) => input.signal.addEventListener("abort", () => resolve()));
            }),
        };
        const handler = jest.fn();
        const hub = new OpencodeRuntimeEventHubService(api as never, undefined, { idleGraceMs: 0 });
        const cleanup = hub.watch({ config: runtime as never, sessionId: "session-a", onEvent: handler });
        await Promise.resolve();
        await onEvent?.({ type: "server.connected", properties: {} });
        expect(handler).not.toHaveBeenCalled();
        cleanup();
        await hub.onModuleDestroy();
    });

    it("preserves custom workspace and credentials for the upstream stream", async () => {
        const normalized = {
            ...runtime,
            workspace: "/custom/workspace",
            basicAuthUser: "custom-user",
            basicAuthPassword: "custom-password",
        };
        let receivedConfig: Record<string, any> | null | undefined;
        const api = {
            normalizeConfig: jest.fn(() => normalized),
            streamEvents: jest.fn(async (input) => {
                receivedConfig = input.config;
                await new Promise<void>((resolve) =>
                    input.signal.addEventListener("abort", () => resolve()),
                );
            }),
        };
        const hub = new OpencodeRuntimeEventHubService(api as never, undefined, {
            idleGraceMs: 0,
        });
        const cleanup = hub.watch({
            config: normalized as never,
            sessionId: "session-a",
            onEvent: jest.fn(),
        });
        await Promise.resolve();

        expect(receivedConfig).toMatchObject({
            baseURL: normalized.baseURL,
            apiKey: "custom-password",
            extendedConfig: {
                workspace: "/custom/workspace",
                basicAuthUser: "custom-user",
                basicAuthPassword: "custom-password",
            },
        });
        cleanup();
        await hub.onModuleDestroy();
    });
});
