import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { AutomationDispatch, AutomationJob, AutomationRun } from "@buildingai/db/entities";
import { In, Repository } from "@buildingai/db/typeorm";
import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";

import { AutomationAdapterRegistry } from "../application/automation-adapter.registry";
import { AutomationService } from "../application/automation.service";

@Injectable()
@Processor("automation")
export class AutomationProcessor extends WorkerHost {
    private readonly logger = new Logger(AutomationProcessor.name);

    constructor(
        private readonly automationService: AutomationService,
        private readonly adapters: AutomationAdapterRegistry,
        @InjectRepository(AutomationRun) private readonly runRepository: Repository<AutomationRun>,
        @InjectRepository(AutomationJob) private readonly jobRepository: Repository<AutomationJob>,
        @InjectRepository(AutomationDispatch) private readonly dispatchRepository: Repository<AutomationDispatch>,
    ) { super(); }

    async process(job: Job<{ runId: string; dispatchId?: string }>) {
        const run = await this.runRepository.findOne({ where: { id: job.data.runId } });
        if (!run) return { skipped: true };
        const task = await this.jobRepository.findOne({ where: { id: run.jobId } });
        if (!task) return { skipped: true };
        const dispatch = job.data.dispatchId
            ? await this.dispatchRepository.findOne({ where: { id: job.data.dispatchId } })
            : undefined;
        if (dispatch?.kind === "deliver" || dispatch?.kind === "failure") {
            const content =
                dispatch.kind === "failure"
                    ? `定时任务执行失败（${(run.errorPreview || "Unknown error").slice(0, 300)}）`
                    : (run.resultPreview || "Agent returned an empty response.");
            await this.deliver(task, run, content, dispatch.kind === "failure", dispatch);
            if (dispatch.kind === "deliver" && task.scheduleKind === "at" && run.deliveryStatus === "delivered") {
                if (task.deleteAfterRun) {
                    // Keep the run and dispatch audit rows while removing only the active job
                    // definition after the required delivery has succeeded.
                    await this.jobRepository.softRemove(task);
                } else {
                    task.status = "completed";
                    await this.jobRepository.save(task);
                }
            }
            return { status: run.deliveryStatus, runId: run.id };
        }
        if (task.overlapPolicy === "skip") {
            const active = await this.runRepository.count({
                where: { jobId: task.id, status: In(["pending", "running", "queued"] as any) },
            });
            if (active > 1) {
                run.status = "skipped";
                run.finishedAt = new Date();
                await this.runRepository.save(run);
                return { status: "skipped", runId: run.id };
            }
        }
        try {
            await this.automationService.executeRun(run.id);
            if (run.status === "unknown") {
                // A timeout may happen after the upstream agent accepted the request. The
                // executor intentionally returns without replaying that work; notify the target
                // about the unknown outcome instead of treating an empty answer as success.
                await this.ensureDeliveryDispatch(task, run, true);
                return { status: "unknown", runId: run.id, delivery: "queued" };
            }
            await this.ensureDeliveryDispatch(task, run, false);
            return { status: "succeeded", runId: run.id, delivery: "queued" };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (run.status === "unknown") {
                run.deliveryStatus = "unknown";
                await this.runRepository.save(run);
                if (dispatch) {
                    dispatch.status = "unknown";
                    dispatch.leaseUntil = null;
                    await this.dispatchRepository.save(dispatch);
                }
                return { status: "unknown", runId: run.id };
            }
            const maxAttempts = Math.max(
                1,
                Math.min(3, Number(task.retryPolicy?.maxAttempts) || 1),
            );
            const attemptNumber = Math.max(1, Number(job.attemptsMade || 0) + 1);
            if (run.status === "failed" && attemptNumber < maxAttempts) {
                // Keep the same logical run and let BullMQ retry this dispatch. A retry must not
                // create a second occurrence or a second delivery notification.
                run.status = "pending";
                run.finishedAt = null;
                await this.runRepository.save(run);
                throw error;
            }
            if (task.scheduleKind === "at") {
                task.status = "failed";
                await this.jobRepository.save(task);
            }
            await this.ensureDeliveryDispatch(task, run, true);
            return { status: run.status, runId: run.id };
        }
    }

    private async ensureDeliveryDispatch(
        task: AutomationJob,
        run: AutomationRun,
        failure: boolean,
    ): Promise<void> {
        const key = `${failure ? "failure" : "delivery"}:${run.id}`;
        const existing = await this.dispatchRepository.findOne({ where: { dispatchKey: key } });
        if (existing) return;
        await this.dispatchRepository.save(
            this.dispatchRepository.create({
                jobId: task.id,
                runId: run.id,
                dispatchKey: key,
                kind: failure ? "failure" : "deliver",
                status: "pending",
                attempts: 0,
                leaseUntil: null,
                nextAttemptAt: null,
                sentAt: null,
                lastError: null,
                payload: {},
            }),
        );
    }

    private async deliver(
        task: AutomationJob,
        run: AutomationRun,
        content: string,
        failure: boolean,
        currentDispatch?: AutomationDispatch,
    ): Promise<void> {
        const target = task.deliveryTarget as any;
        const adapter = this.adapters.get(task.channel);
        const key = `${failure ? "failure" : "delivery"}:${run.id}`;
        let dispatch = currentDispatch || await this.dispatchRepository.findOne({ where: { dispatchKey: key } });
        if (!dispatch) dispatch = await this.dispatchRepository.save(this.dispatchRepository.create({ jobId: task.id, runId: run.id, dispatchKey: key, kind: failure ? "failure" : "deliver", status: "pending", attempts: 0, leaseUntil: null, nextAttemptAt: null, sentAt: null, lastError: null, payload: {} }));
        if (dispatch.status === "dismissed") return;
        let receipt;
        try {
            receipt = await adapter.sendText(target, content.slice(0, 12000), key);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const unknown = /timeout|timed out|socket|network/i.test(message);
            receipt = {
                status: unknown ? ("unknown" as const) : ("failed" as const),
                errorCode: unknown ? "PROVIDER_TIMEOUT" : "PROVIDER_ERROR",
                errorMessage: message.slice(0, 300),
            };
        }
        dispatch.status = receipt.status === "delivered" ? "sent" : receipt.status;
        dispatch.sentAt = receipt.status === "delivered" ? new Date() : null;
        dispatch.lastError = receipt.errorMessage?.slice(0, 500) || null;
        if (receipt.status === "failed") {
            const maxAttempts = Math.max(
                1,
                Math.min(3, Number((task.deliveryPolicy as any)?.maxAttempts) || 3),
            );
            const backoffSeconds = Math.max(
                1,
                Number((task.deliveryPolicy as any)?.backoffSeconds) || 30,
            );
            dispatch.nextAttemptAt =
                dispatch.attempts >= maxAttempts
                    ? new Date("9999-12-31T23:59:59.999Z")
                    : new Date(Date.now() + backoffSeconds * 1000);
        } else {
            dispatch.nextAttemptAt = null;
        }
        await this.dispatchRepository.save(dispatch);
        run.deliveryStatus = receipt.status;
        run.providerMessageId = receipt.providerMessageId || null;
        await this.runRepository.save(run);
    }

    @OnWorkerEvent("failed")
    async onFailed(
        job: Job<{ runId?: string; dispatchId?: string }>,
        error: Error,
    ): Promise<void> {
        this.logger.error(`Automation queue job failed ${job.id}: ${error.message}`);
        const dispatchId = job.data?.dispatchId;
        if (!dispatchId) return;
        const maxQueueAttempts = Math.max(1, Number(job.opts.attempts) || 1);
        const attemptsMade = Math.max(0, Number(job.attemptsMade) || 0);
        if (attemptsMade < maxQueueAttempts) {
            // BullMQ emits `failed` for every failed attempt. The processor deliberately throws
            // transient agent errors so BullMQ can retry the same logical run; only the final
            // failure is an ambiguous outbox boundary that needs operator recovery.
            return;
        }
        await this.dispatchRepository.update(dispatchId, {
            status: "unknown",
            leaseUntil: null,
            nextAttemptAt: null,
            lastError: `Queue worker failed: ${error.message}`.slice(0, 500),
        });
    }
}
