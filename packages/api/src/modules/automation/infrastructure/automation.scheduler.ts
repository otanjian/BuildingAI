import { InjectQueue } from "@nestjs/bullmq";
import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AutomationDispatch } from "@buildingai/db/entities";
import { Repository } from "@buildingai/db/typeorm";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Interval } from "@buildingai/core/@nestjs/schedule";
import type { Queue } from "bullmq";

import { AutomationService } from "../application/automation.service";
import { automationQueueJobId } from "./automation-queue-id";

@Injectable()
export class AutomationScheduler implements OnModuleInit {
    private readonly logger = new Logger(AutomationScheduler.name);
    private lastReconciledAt: Date | null = null;
    private running = false;
    private initialized = false;

    constructor(
        private readonly automationService: AutomationService,
        @InjectRepository(AutomationDispatch) private readonly dispatchRepository: Repository<AutomationDispatch>,
        @InjectQueue("automation") private readonly queue: Queue,
    ) {}

    async onModuleInit() {
        this.initialized = true;
        await this.tick();
    }

    @Interval(5000)
    async tick(): Promise<void> {
        if (this.running) return;
        this.running = true;
        try {
            await this.automationService.reconcileMissedJobs(new Date(), 50);
            await this.automationService.claimDueJobs(new Date(), 50);
            const now = new Date();
            const dispatches = await this.dispatchRepository.createQueryBuilder("dispatch")
                .where(
                    "dispatch.status IN (:...statuses) AND (dispatch.nextAttemptAt IS NULL OR dispatch.nextAttemptAt <= :now)",
                    { statuses: ["pending", "failed"], now },
                )
                .orWhere("dispatch.status = :leased AND dispatch.leaseUntil < :now", { leased: "leased", now })
                .orderBy("dispatch.createdAt", "ASC")
                .take(50)
                .getMany();
            for (const dispatch of dispatches) {
                const previousDispatchStatus = dispatch.status;
                const leaseUntil = new Date(Date.now() + 60_000);
                const claimed = await this.dispatchRepository.createQueryBuilder()
                    .update(AutomationDispatch)
                    .set({ status: "leased", leaseUntil, attempts: () => '"attempts" + 1' })
                    .where("id = :id AND (status IN (:...statuses) OR (status = 'leased' AND leaseUntil < :now))", { id: dispatch.id, statuses: ["pending", "failed"], now })
                    .execute();
                if (!claimed.affected) continue;
                try {
                    const task = await this.automationService.getJobById(dispatch.jobId);
                    // Keep one deterministic queue identity per outbox dispatch. If the API
                    // crashed after Redis accepted the job but before the database lease was
                    // acknowledged, an active job is reused instead of creating a duplicate.
                    // A terminal failed job is removed before an explicit outbox recovery
                    // requeue; its durable outcome is already retained in automation_dispatch.
                    const queueJobId = automationQueueJobId(dispatch.dispatchKey);
                    const existingQueueJob = await this.queue.getJob(queueJobId);
                    if (existingQueueJob) {
                        const state = await existingQueueJob.getState();
                        if (state === "completed") {
                            await this.markQueued(dispatch.id);
                            continue;
                        }
                        if (!["failed", "unknown", "removed"].includes(state)) {
                            await this.markQueued(dispatch.id);
                            continue;
                        }
                        if (state === "failed" || state === "unknown") {
                            if (previousDispatchStatus === "failed" || previousDispatchStatus === "pending") {
                                await existingQueueJob.remove().catch(() => undefined);
                            } else {
                                // A stale lease can mean the worker already started a
                                // non-idempotent model/provider call. Do not replay it
                                // automatically; surface an explicit unknown state for operator
                                // recovery instead.
                                await this.dispatchRepository.update(dispatch.id, {
                                    status: "unknown",
                                    leaseUntil: null,
                                    nextAttemptAt: null,
                                    lastError: "Queue job failed before outbox acknowledgement; operator recovery required",
                                });
                                continue;
                            }
                        }
                    }
                    await this.queue.add("automation", { runId: dispatch.runId, dispatchId: dispatch.id }, { jobId: queueJobId, attempts: Math.max(1, Math.min(3, task?.retryPolicy?.maxAttempts || 1)), backoff: { type: "exponential", delay: Math.max(1000, (task?.retryPolicy?.backoffSeconds || 30) * 1000) }, removeOnComplete: true, removeOnFail: false });
                    await this.markQueued(dispatch.id);
                } catch (error) {
                    await this.dispatchRepository
                        .createQueryBuilder()
                        .update(AutomationDispatch)
                        .set({ status: "failed", leaseUntil: null, nextAttemptAt: new Date(Date.now() + 30_000), lastError: (error as Error).message.slice(0, 500) })
                        .where("id = :id AND status = 'leased'", { id: dispatch.id })
                        .execute();
                }
            }
            this.lastReconciledAt = new Date();
        } catch (error) {
            this.logger.warn(`Automation scheduler tick failed: ${(error as Error).message}`);
        } finally { this.running = false; }
    }

    getHealth() {
        return {
            active: this.initialized,
            running: this.running,
            lastReconciledAt: this.lastReconciledAt?.toISOString() || null,
        };
    }

    private async markQueued(id: string): Promise<void> {
        // Do not overwrite an `unknown` result written concurrently by the worker's failed
        // handler. The conditional transition is the outbox's queue-acceptance fence.
        await this.dispatchRepository
            .createQueryBuilder()
            .update(AutomationDispatch)
            .set({
                status: "sent",
                sentAt: new Date(),
                leaseUntil: null,
                nextAttemptAt: null,
                lastError: null,
            })
            .where("id = :id AND status = 'leased'", { id })
            .execute();
    }
}
