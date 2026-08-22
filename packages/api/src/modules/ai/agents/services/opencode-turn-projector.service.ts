import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import type { OpencodeTurnStatus } from "@buildingai/db/entities";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Optional } from "@nestjs/common";

import type { OpencodeSessionMessage } from "../integrations/opencode-api.service";
import { createSensitiveWordFilter } from "../utils/sensitive-word-filter";
import { OpencodeTurnRepository } from "./opencode-turn.repository";
import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";

type ProjectorOptions = { batchMs: number };

export type OpencodeTurnProjectInput = {
    turnId: string;
    leaseToken: string;
    status: Extract<OpencodeTurnStatus, "accepted" | "running" | "committing">;
    remoteUserMessageId: string;
    messages: OpencodeSessionMessage[];
    sensitiveWordConfig?: Parameters<typeof createSensitiveWordFilter>[0];
};

@Injectable()
export class OpencodeTurnProjectorService {
    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
    private readonly rerun = new Map<string, () => Promise<unknown>>();
    private readonly options: ProjectorOptions;

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly turnRepository: OpencodeTurnRepository,
        @Optional() options?: Partial<ProjectorOptions>,
        @Optional() private readonly telemetry?: OpencodeTurnTelemetryService,
    ) {
        this.options = { batchMs: options?.batchMs ?? 100 };
    }

    async project(input: OpencodeTurnProjectInput) {
        const startedAt = Date.now();
        const descendants = input.messages.filter(
            (message) =>
                message.info?.role === "assistant" &&
                message.info.parentID === input.remoteUserMessageId &&
                Boolean(message.info.id),
        );
        const filter = createSensitiveWordFilter(input.sensitiveWordConfig);
        const parts = descendants.flatMap((message) =>
            (message.parts ?? []).flatMap((part) => {
                const projected = this.projectPart(part, filter);
                return projected ? [projected] : [];
            }),
        );
        if (descendants.length === 0 || !this.hasVisiblePart(parts)) {
            return { changed: false, version: null };
        }

        const result = await this.dataSource.transaction((manager) =>
            this.turnRepository.recordLiveProjection(manager, {
                turnId: input.turnId,
                leaseToken: input.leaseToken,
                projection: {
                    status: input.status,
                    parts,
                    remoteAssistantMessageIds: descendants.map((message) => message.info!.id!),
                },
            }),
        );
        if (result.changed) {
            this.telemetry?.increment("projection_write", { turnId: input.turnId });
            if (result.turn?.liveProjection?.truncated === true) {
                this.telemetry?.increment("projection_truncation", { turnId: input.turnId });
            }
        }
        this.telemetry?.observe("projection_latency_ms", Date.now() - startedAt, {
            turnId: input.turnId,
            changed: result.changed,
        });
        return result;
    }

    schedule(turnId: string, refresh: () => Promise<unknown>): void {
        if (this.timers.has(turnId)) {
            this.rerun.set(turnId, refresh);
            return;
        }
        const timer = setTimeout(() => {
            this.timers.delete(turnId);
            void Promise.resolve(refresh()).finally(() => {
                const next = this.rerun.get(turnId);
                if (!next) return;
                this.rerun.delete(turnId);
                this.schedule(turnId, next);
            });
        }, this.options.batchMs);
        timer.unref?.();
        this.timers.set(turnId, timer);
    }

    private projectPart(
        part: Record<string, unknown>,
        filter: ReturnType<typeof createSensitiveWordFilter>,
    ): Record<string, unknown> | null {
        if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
            return { type: "text", text: filter.filterText(part.text) };
        }
        if (part.type === "reasoning" && typeof part.text === "string" && part.text.trim()) {
            return { type: "reasoning", text: filter.filterText(part.text), state: "streaming" };
        }
        if (part.type !== "tool") return null;
        const state = part.state && typeof part.state === "object" ? part.state as Record<string, unknown> : {};
        const status = String(state.status ?? "pending");
        return {
            type: "dynamic-tool",
            toolCallId: String(part.callID ?? part.id ?? "unknown"),
            toolName: String(part.tool ?? "tool"),
            state:
                status === "completed"
                    ? "output-available"
                    : status === "error"
                      ? "output-error"
                      : "input-available",
            input: state.input && typeof state.input === "object" ? state.input : {},
            ...(status === "completed" ? { output: state.output ?? state.title ?? "ok" } : {}),
            ...(status === "error" ? { errorText: String(state.error ?? "OpenCode tool error") } : {}),
        };
    }

    private hasVisiblePart(parts: Array<Record<string, unknown>>): boolean {
        return parts.some((part) =>
            part.type === "dynamic-tool" ||
            ((part.type === "text" || part.type === "reasoning") &&
                typeof part.text === "string" &&
                part.text.trim().length > 0),
        );
    }
}
