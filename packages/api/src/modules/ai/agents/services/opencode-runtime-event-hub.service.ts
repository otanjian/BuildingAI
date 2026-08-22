import type { ThirdPartyIntegrationConfig } from "@buildingai/types/ai/agent-config.interface";
import { Injectable, Logger, OnModuleDestroy, Optional } from "@nestjs/common";
import { createHash } from "node:crypto";

import {
    OpencodeApiService,
    type OpencodeNormalizedConfig,
    type OpencodeSseHandler,
} from "../integrations/opencode-api.service";
import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

type HubOptions = {
    idleGraceMs: number;
    retryBaseMs: number;
    retryMaxMs: number;
};

type Listener = (event: Parameters<OpencodeSseHandler>[0]) => void | Promise<void>;

type RuntimeEntry = {
    key: string;
    config: OpencodeNormalizedConfig;
    streamConfig: ThirdPartyIntegrationConfig;
    controller: AbortController;
    sessions: Map<string, Set<Listener>>;
    reconnectAttempt: number;
    running?: Promise<void>;
    idleTimer?: ReturnType<typeof setTimeout>;
};

@Injectable()
export class OpencodeRuntimeEventHubService implements OnModuleDestroy {
    private readonly logger = new Logger(OpencodeRuntimeEventHubService.name);
    private readonly runtimes = new Map<string, RuntimeEntry>();
    private readonly options: HubOptions;
    private destroying = false;

    constructor(
        private readonly opencodeApiService: OpencodeApiService,
        @Optional() private readonly telemetry?: OpencodeTurnTelemetryService,
        @Optional() options?: Partial<HubOptions>,
    ) {
        this.options = {
            idleGraceMs: options?.idleGraceMs ?? 5_000,
            retryBaseMs: options?.retryBaseMs ?? 500,
            retryMaxMs: options?.retryMaxMs ?? 10_000,
        };
    }

    watch(input: {
        config?: ThirdPartyIntegrationConfig | OpencodeNormalizedConfig | null;
        sessionId: string;
        onEvent: Listener;
    }): () => void {
        const config = this.isNormalizedConfig(input.config)
            ? input.config
            : this.opencodeApiService.normalizeConfig(input.config);
        const key = this.runtimeKey(config);
        let entry = this.runtimes.get(key);
        if (!entry) {
            entry = {
                key,
                config,
                streamConfig: this.toStreamConfig(config),
                controller: new AbortController(),
                sessions: new Map(),
                reconnectAttempt: 0,
            };
            this.runtimes.set(key, entry);
        }
        if (entry.idleTimer) clearTimeout(entry.idleTimer);
        const listeners = entry.sessions.get(input.sessionId) ?? new Set<Listener>();
        listeners.add(input.onEvent);
        entry.sessions.set(input.sessionId, listeners);
        this.ensureRunning(entry);
        this.telemetry?.gauge("projection_upstream_connections", this.runtimes.size);

        let removed = false;
        return () => {
            if (removed) return;
            removed = true;
            const current = entry!.sessions.get(input.sessionId);
            current?.delete(input.onEvent);
            if (current?.size === 0) entry!.sessions.delete(input.sessionId);
            if (entry!.sessions.size === 0) this.scheduleIdleClose(entry!);
        };
    }

    async onModuleDestroy(): Promise<void> {
        this.destroying = true;
        const running = [...this.runtimes.values()].flatMap((entry) => {
            if (entry.idleTimer) clearTimeout(entry.idleTimer);
            entry.controller.abort();
            return entry.running ? [entry.running] : [];
        });
        await Promise.allSettled(running);
        this.runtimes.clear();
    }

    private ensureRunning(entry: RuntimeEntry): void {
        if (entry.running || this.destroying) return;
        entry.running = this.run(entry).finally(() => {
            entry.running = undefined;
        });
    }

    private async run(entry: RuntimeEntry): Promise<void> {
        while (!this.destroying && !entry.controller.signal.aborted && entry.sessions.size > 0) {
            try {
                this.telemetry?.increment("projection_sse_connection", { runtimeKey: entry.key });
                await this.opencodeApiService.streamEvents({
                    config: entry.streamConfig,
                    signal: entry.controller.signal,
                    onEvent: async (event) => this.route(entry, event),
                });
                if (entry.controller.signal.aborted || this.destroying || entry.sessions.size === 0) {
                    break;
                }
                entry.reconnectAttempt += 1;
                this.telemetry?.increment("projection_sse_reconnect", {
                    runtimeKey: entry.key,
                    attempt: entry.reconnectAttempt,
                    reason: "upstream_closed",
                });
                await this.delay(
                    Math.min(
                        this.options.retryBaseMs * 2 ** (entry.reconnectAttempt - 1),
                        this.options.retryMaxMs,
                    ),
                    entry.controller.signal,
                );
            } catch (error) {
                if (entry.controller.signal.aborted || this.destroying) break;
                entry.reconnectAttempt += 1;
                this.telemetry?.increment("projection_sse_reconnect", {
                    runtimeKey: entry.key,
                    attempt: entry.reconnectAttempt,
                });
                this.logger.warn(
                    `OpenCode runtime projection stream retry runtime=${entry.key} error=${
                        error instanceof Error ? error.name : "unknown"
                    }`,
                );
                await this.delay(
                    Math.min(
                        this.options.retryBaseMs * 2 ** (entry.reconnectAttempt - 1),
                        this.options.retryMaxMs,
                    ),
                    entry.controller.signal,
                );
            }
        }
    }

    private async route(
        entry: RuntimeEntry,
        event: Parameters<OpencodeSseHandler>[0],
    ): Promise<void> {
        const sessionId = this.sessionId(event);
        if (!sessionId) return;
        const listeners = [...(entry.sessions.get(sessionId) ?? [])];
        await Promise.allSettled(listeners.map((listener) => listener(event)));
    }

    private sessionId(event: Parameters<OpencodeSseHandler>[0]): string | null {
        const properties = event.properties ?? {};
        const info = properties.info && typeof properties.info === "object"
            ? properties.info as Record<string, unknown>
            : {};
        const value = properties.sessionID ?? properties.sessionId ?? info.sessionID ?? info.sessionId;
        return typeof value === "string" && value ? value : null;
    }

    private scheduleIdleClose(entry: RuntimeEntry): void {
        if (entry.idleTimer) clearTimeout(entry.idleTimer);
        entry.idleTimer = setTimeout(() => {
            if (entry.sessions.size > 0) return;
            entry.controller.abort();
            this.runtimes.delete(entry.key);
            this.telemetry?.gauge("projection_upstream_connections", this.runtimes.size);
        }, this.options.idleGraceMs);
        entry.idleTimer.unref?.();
    }

    private runtimeKey(config: OpencodeNormalizedConfig): string {
        return createHash("sha256")
            .update(JSON.stringify({ baseURL: config.baseURL, workspace: config.workspace }))
            .digest("hex");
    }

    private isNormalizedConfig(
        config: ThirdPartyIntegrationConfig | OpencodeNormalizedConfig | null | undefined,
    ): config is OpencodeNormalizedConfig {
        return Boolean(
            config &&
                "workspace" in config &&
                typeof config.workspace === "string" &&
                "artifactDirTemplate" in config &&
                typeof config.artifactDirTemplate === "string",
        );
    }

    private toStreamConfig(config: OpencodeNormalizedConfig): ThirdPartyIntegrationConfig {
        return {
            provider: "opencode",
            baseURL: config.baseURL,
            apiKey: config.basicAuthPassword,
            useExternalConversation: config.useExternalConversation,
            extendedConfig: {
                workspace: config.workspace,
                artifactDirTemplate: config.artifactDirTemplate,
                basicAuthUser: config.basicAuthUser,
                basicAuthPassword: config.basicAuthPassword,
                ...(config.model
                    ? { model: `${config.model.providerID}/${config.model.modelID}` }
                    : {}),
            },
        };
    }

    private delay(ms: number, signal: AbortSignal): Promise<void> {
        return new Promise((resolve) => {
            if (signal.aborted) return resolve();
            const timer = setTimeout(resolve, ms);
            const onAbort = () => {
                clearTimeout(timer);
                resolve();
            };
            signal.addEventListener("abort", onAbort, { once: true });
        });
    }
}
