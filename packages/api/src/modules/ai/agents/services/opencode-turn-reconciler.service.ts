import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from "@nestjs/common";

import { OpencodeTurnLeaseLostError, OpencodeTurnLeaseRepository } from "./opencode-turn-lease.repository";
import { OpencodeTurnTelemetryService } from "./opencode-turn-telemetry.service";
import { OpencodeTurnWorkerService } from "./opencode-turn-worker.service";

export type OpencodeTurnWorkerOptions = {
    capacity: number;
    leaseDurationMs: number;
    intervalMs: number;
};

const DEFAULT_OPTIONS: OpencodeTurnWorkerOptions = {
    capacity: 2,
    leaseDurationMs: 30_000,
    intervalMs: 1_000,
};

@Injectable()
export class OpencodeTurnReconcilerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OpencodeTurnReconcilerService.name);
    private readonly controllers = new Map<string, AbortController>();
    private readonly inFlight = new Set<Promise<void>>();
    private timer?: ReturnType<typeof setInterval>;
    private ticking = false;
    private destroying = false;
    private readonly options: OpencodeTurnWorkerOptions;

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly leaseRepository: OpencodeTurnLeaseRepository,
        private readonly worker: OpencodeTurnWorkerService,
        @Optional() options?: Partial<OpencodeTurnWorkerOptions>,
        @Optional() private readonly telemetry?: OpencodeTurnTelemetryService,
    ) {
        this.options = {
            capacity: options?.capacity ?? Number(process.env.OPENCODE_TURN_WORKER_CAPACITY ?? 2),
            leaseDurationMs:
                options?.leaseDurationMs ??
                Number(process.env.OPENCODE_TURN_LEASE_DURATION_MS ?? 30_000),
            intervalMs:
                options?.intervalMs ?? Number(process.env.OPENCODE_TURN_RECONCILE_MS ?? 1_000),
        };
        this.assertOptions();
    }

    onModuleInit(): void {
        this.timer = setInterval(() => {
            void this.tick().catch((error) => this.logTickFailure(error));
        }, this.options.intervalMs);
        this.timer.unref?.();
        void this.tick().catch((error) => this.logTickFailure(error));
    }

    async onModuleDestroy(): Promise<void> {
        this.destroying = true;
        if (this.timer) clearInterval(this.timer);
        for (const controller of this.controllers.values()) controller.abort();
        await Promise.allSettled([...this.inFlight]);
    }

    async tick(): Promise<void> {
        if (this.destroying || this.ticking) return;
        try {
            await this.telemetry?.refreshQueueMetrics(
                this.dataSource.manager,
                this.options.capacity,
                this.inFlight.size,
            );
        } catch (error) {
            this.logger.warn(
                `OpenCode turn metrics refresh failed: ${
                    error instanceof Error ? error.message : String(error)
                }`,
            );
        }
        const freeSlots = this.options.capacity - this.inFlight.size;
        if (freeSlots <= 0) return;
        this.ticking = true;
        try {
            const claims = await this.dataSource.transaction((manager) =>
                this.leaseRepository.claimAvailable(manager, {
                    limit: freeSlots,
                    now: new Date(),
                    leaseDurationMs: this.options.leaseDurationMs,
                }),
            );
            if (claims.length > 0) {
                this.telemetry?.increment(
                    "recovery_claim",
                    {
                        claimCount: claims.length,
                        workerCapacity: this.options.capacity,
                        inFlight: this.inFlight.size,
                    },
                    claims.length,
                );
            }
            if (this.destroying) {
                await Promise.allSettled(
                    claims.map((claim) =>
                        this.dataSource.transaction((manager) =>
                            this.leaseRepository.release(manager, {
                                turnId: claim.id,
                                leaseToken: claim.leaseToken,
                            }),
                        ),
                    ),
                );
                return;
            }
            const steps = claims.map((claim) => this.startStep(claim.id, claim.leaseToken));
            await Promise.allSettled(steps);
        } finally {
            this.ticking = false;
        }
    }

    private startStep(turnId: string, leaseToken: string): Promise<void> {
        const controller = new AbortController();
        this.controllers.set(turnId, controller);
        const renewTimer = setInterval(() => {
            void this.dataSource
                .transaction((manager) =>
                    this.leaseRepository.renew(manager, {
                        turnId,
                        leaseToken,
                        now: new Date(),
                        leaseDurationMs: this.options.leaseDurationMs,
                    }),
                )
                .catch((error) => {
                    this.logger.warn(
                        `OpenCode turn lease renewal failed turnId=${turnId}: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                    );
                    controller.abort();
                });
        }, Math.max(1, Math.floor(this.options.leaseDurationMs / 2)));
        renewTimer.unref?.();
        const promise = (async () => {
            try {
                await this.worker.runStep({
                    turnId,
                    leaseToken,
                    signal: controller.signal,
                });
            } catch (error) {
                if (!controller.signal.aborted) {
                    this.logger.warn(
                        `OpenCode turn step failed turnId=${turnId}: ${
                            error instanceof Error ? error.message : String(error)
                        }`,
                    );
                }
            } finally {
                clearInterval(renewTimer);
                this.controllers.delete(turnId);
                try {
                    await this.dataSource.transaction((manager) =>
                        this.leaseRepository.release(manager, { turnId, leaseToken }),
                    );
                } catch (error) {
                    if (!(error instanceof OpencodeTurnLeaseLostError)) {
                        this.logger.warn(
                            `OpenCode turn lease release failed turnId=${turnId}: ${
                                error instanceof Error ? error.message : String(error)
                            }`,
                        );
                    }
                }
            }
        })();
        this.inFlight.add(promise);
        void promise.finally(() => this.inFlight.delete(promise));
        return promise;
    }

    private assertOptions(): void {
        for (const [name, value] of Object.entries(this.options)) {
            if (!Number.isInteger(value) || value <= 0) {
                throw new RangeError(`OpenCode turn worker ${name} must be a positive integer`);
            }
        }
    }

    private logTickFailure(error: unknown): void {
        this.logger.warn(
            `OpenCode turn reconciliation deferred: ${
                error instanceof Error ? error.message : String(error)
            }`,
        );
    }
}
