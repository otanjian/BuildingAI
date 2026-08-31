import { InjectDataSource, InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import {
    Agent,
    AutomationDispatch,
    AutomationJob,
    AutomationRun,
    ChannelAccount,
} from "@buildingai/db/entities";
import { DataSource, In, IsNull, Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
    DEFAULT_UNATTENDED_TOOL_POLICY,
    type AutomationCommandContext,
    type AutomationDeliveryTarget,
    type AutomationSchedule,
} from "../domain/automation.types";
import { nextOccurrence, occurrenceKey, parseSchedule } from "../domain/schedule-calculator";
import type { AutomationExecutionResult, AutomationExecutor } from "./automation-executor";
import { AutomationAdapterRegistry } from "./automation-adapter.registry";
import { automationCreatorFilters } from "./automation-creator-scope";

const MAX_TASKS_PER_CREATOR = 50;
const MAX_PROMPT_LENGTH = 12_000;
const PREVIEW_LENGTH = 12_000;

export interface CreateAutomationInput {
    context: AutomationCommandContext;
    agentId: string;
    name: string;
    prompt: string;
    schedule: AutomationSchedule;
    target: AutomationDeliveryTarget;
    deleteAfterRun?: boolean;
    missedRunPolicy?: "fire_once" | "skip" | "catch_up";
    overlapPolicy?: "skip" | "queue_one" | "allow";
    timeoutSeconds?: number;
}

export interface UpdateAutomationInput {
    name?: string;
    prompt?: string;
    schedule?: AutomationSchedule;
    deleteAfterRun?: boolean;
    missedRunPolicy?: "fire_once" | "skip" | "catch_up";
    overlapPolicy?: "skip" | "queue_one" | "allow";
    timeoutSeconds?: number;
    expectedUpdatedAt?: string;
}

type AutomationScopeContext = Pick<
    AutomationCommandContext,
    "actorId" | "channel" | "accountId" | "tenantId" | "conversationId"
>;

@Injectable()
export class AutomationService {
    private readonly logger = new Logger(AutomationService.name);

    constructor(
        @InjectRepository(AutomationJob) private readonly jobRepository: Repository<AutomationJob>,
        @InjectRepository(AutomationRun) private readonly runRepository: Repository<AutomationRun>,
        @InjectRepository(AutomationDispatch)
        private readonly dispatchRepository: Repository<AutomationDispatch>,
        @InjectRepository(ChannelAccount)
        private readonly accountRepository: Repository<ChannelAccount>,
        @InjectRepository(Agent) private readonly agentRepository: Repository<Agent>,
        @InjectDataSource() private readonly dataSource: DataSource,
        @Inject("AUTOMATION_EXECUTOR") private readonly executor: AutomationExecutor,
        private readonly adapters: AutomationAdapterRegistry,
    ) {}

    async create(input: CreateAutomationInput): Promise<AutomationJob> {
        const existing = input.context.eventId
            ? await this.jobRepository.findOne({
                  where: {
                      creatorId: input.context.actorId,
                      createIdempotencyKey: input.context.eventId,
                  },
              })
            : null;
        if (existing) {
            const existingTarget = existing.deliveryTarget as unknown as AutomationDeliveryTarget;
            const sameScope =
                existing.channel === input.context.channel &&
                (existing.tenantId || null) === (input.context.tenantId || null) &&
                existing.conversationId === input.context.conversationId &&
                existingTarget?.channel === input.target.channel &&
                existingTarget?.accountId === input.target.accountId &&
                existingTarget?.targetType === input.target.targetType &&
                existingTarget?.targetId === input.target.targetId;
            if (sameScope) return existing;
            throw HttpErrorFactory.conflict("Idempotency key is already used in another scope");
        }
        if (!input.name?.trim()) throw HttpErrorFactory.badRequest("Task name is required");
        if (!input.prompt?.trim()) throw HttpErrorFactory.badRequest("Prompt is required");
        if (input.prompt.length > MAX_PROMPT_LENGTH)
            throw HttpErrorFactory.badRequest("Prompt is too long");
        const schedule = parseSchedule(input.schedule);
        const agent = await this.agentRepository.findOne({ where: { id: input.agentId } });
        if (!agent) throw HttpErrorFactory.badRequest("Agent not found");
        const count = await this.jobRepository.count({
            where: { creatorId: input.context.actorId, status: In(["active", "paused"] as any) },
        });
        if (count >= MAX_TASKS_PER_CREATOR)
            throw HttpErrorFactory.badRequest("Task quota exceeded");
        if (
            input.target.channel !== input.context.channel ||
            input.target.accountId !== input.context.accountId
        ) {
            throw HttpErrorFactory.forbidden(
                "Delivery target is outside the current channel scope",
            );
        }
        await this.adapters.get(input.context.channel).validateTarget(input.target);
        const account = await this.accountRepository.findOne({
            where: {
                provider: input.context.channel,
                accountKey: input.context.accountId,
            },
        });
        this.assertAccountTenant(account, input.context.tenantId);
        if (account && !account.enabled)
            throw HttpErrorFactory.badRequest("Channel account is disabled");
        if (account?.metadata?.agentId && account.metadata.agentId !== input.agentId) {
            throw HttpErrorFactory.forbidden("Channel account is not bound to this agent");
        }
        if (
            agent.createBy &&
            agent.createBy !== input.context.actorId &&
            !input.context.actorId.startsWith("external:")
        ) {
            throw HttpErrorFactory.forbidden("You cannot schedule this agent");
        }
        const channelAccount =
            account ||
            (await this.accountRepository.save(
                this.accountRepository.create({
                    provider: input.context.channel,
                    accountKey: input.context.accountId,
                    tenantRef: input.context.tenantId || null,
                    secretRef: null,
                    metadata: { agentId: input.agentId },
                    enabled: true,
                }),
            ));
        const now = new Date();
        const nextRunAt = nextOccurrence(schedule, new Date(now.getTime() - 1000));
        if (!nextRunAt) throw HttpErrorFactory.badRequest("Schedule has no future occurrence");
        const job = this.jobRepository.create({
            name: input.name.trim().slice(0, 200),
            agentId: input.agentId,
            prompt: input.prompt.trim(),
            scheduleKind: schedule.kind,
            schedule: schedule as unknown as Record<string, unknown>,
            timezone:
                schedule.kind === "cron"
                    ? schedule.timezone
                    : schedule.kind === "every"
                      ? schedule.timezone || "UTC"
                      : "UTC",
            channel: input.context.channel,
            channelAccountId: channelAccount.id,
            creatorId: input.context.actorId,
            tenantId: input.context.tenantId || null,
            conversationId: input.context.conversationId,
            deliveryTarget: input.target as unknown as Record<string, unknown>,
            status: "active",
            nextRunAt,
            lastRunAt: null,
            missedRunPolicy: input.missedRunPolicy || "fire_once",
            overlapPolicy: input.overlapPolicy || "skip",
            timeoutSeconds: Math.min(86_400, Math.max(1, input.timeoutSeconds || 900)),
            retryPolicy: { maxAttempts: 3, backoffSeconds: 30 },
            toolPolicy: { ...DEFAULT_UNATTENDED_TOOL_POLICY },
            deliveryPolicy: { required: true, maxAttempts: 3 },
            deleteAfterRun: Boolean(input.deleteAfterRun),
            createIdempotencyKey: input.context.eventId || null,
            retentionUntil: null,
        } as any) as unknown as AutomationJob;
        return this.jobRepository.save(job as any) as Promise<AutomationJob>;
    }

    async list(context: AutomationScopeContext): Promise<AutomationJob[]> {
        const account = await this.findScopeAccount(context);
        if (!account) return [];
        this.assertAccountTenant(account, context.tenantId);
        return this.jobRepository.find({
            where: {
                creatorId: context.actorId,
                channel: context.channel,
                channelAccountId: account.id,
                tenantId: context.tenantId || IsNull(),
                conversationId: context.conversationId,
            },
            order: { nextRunAt: "ASC" },
            take: 100,
        });
    }

    async listForScope(context: AutomationScopeContext): Promise<Array<Record<string, unknown>>> {
        return this.toPublicTasks(await this.list(context));
    }

    async listForCreator(creatorId: string): Promise<Array<Record<string, unknown>>> {
        // Channel-created tasks use a provider-scoped external creator ID. The owner of the
        // selected agent is the authenticated web workspace owner, so include those tasks while
        // keeping channel-scope operations restricted to the external creator below.
        const ownedAgents = await this.agentRepository.find({ where: { createBy: creatorId } });
        const ownerAgentIds = ownedAgents.map((agent) => String(agent.id));
        const where = automationCreatorFilters(creatorId, ownerAgentIds);
        const jobs = await this.jobRepository.find({
            where,
            order: { nextRunAt: "ASC" },
            take: 100,
        });
        return this.toPublicTasks(jobs);
    }

    async transition(
        context: AutomationScopeContext,
        id: string,
        operation: "pause" | "resume" | "cancel",
        expectedUpdatedAt?: string,
    ): Promise<AutomationJob> {
        if (!["pause", "resume", "cancel"].includes(operation))
            throw HttpErrorFactory.badRequest("Unsupported task operation");
        const job = await this.findInScope(context, id);
        this.assertExpectedUpdatedAt(job, expectedUpdatedAt);
        if (operation === "pause" && job.status === "active") job.status = "paused";
        if (operation === "resume" && job.status === "paused") job.status = "active";
        if (operation === "cancel" && !["cancelled", "completed"].includes(job.status))
            job.status = "cancelled";
        return this.jobRepository.save(job);
    }

    async transitionForScope(
        context: AutomationScopeContext,
        id: string,
        operation: "pause" | "resume" | "cancel",
        expectedUpdatedAt?: string,
    ): Promise<Record<string, unknown>> {
        const saved = await this.transition(context, id, operation, expectedUpdatedAt);
        return (await this.toPublicTasks([saved]))[0] || {};
    }

    async update(
        context: AutomationScopeContext,
        id: string,
        input: UpdateAutomationInput,
    ): Promise<Record<string, unknown>> {
        const job = await this.findInScope(context, id);
        const saved = await this.updateJob(job, input);
        return (await this.toPublicTasks([saved]))[0] || {};
    }

    async updateForCreator(
        creatorId: string,
        id: string,
        input: UpdateAutomationInput,
    ): Promise<Record<string, unknown>> {
        const job = await this.findForCreator(creatorId, id);
        const saved = await this.updateJob(job, input);
        return (await this.toPublicTasks([saved]))[0] || {};
    }

    async runOnce(
        context: AutomationScopeContext,
        id: string,
        idempotencyKey: string,
    ): Promise<AutomationRun> {
        const job = await this.findInScope(context, id);
        if (["cancelled", "completed"].includes(job.status)) {
            throw HttpErrorFactory.conflict("Terminal task cannot be run");
        }
        const occurrence = new Date();
        const key = `manual:${idempotencyKey}`;
        const existing = await this.runRepository.findOne({
            where: { jobId: job.id, occurrenceKey: key },
        });
        if (existing) return existing;
        const run = await this.runRepository.save(
            this.runRepository.create({
                jobId: job.id,
                occurrenceKey: key,
                trigger: "manual",
                status: "pending",
                scheduledAt: occurrence,
                startedAt: null,
                finishedAt: null,
                attempt: 0,
                conversationId: null,
                resultPreview: null,
                errorPreview: null,
                deliveryStatus: "pending",
                providerMessageId: null,
                retentionUntil: null,
            }),
        );
        await this.dispatchRepository.save(
            this.dispatchRepository.create({
                jobId: job.id,
                runId: run.id,
                dispatchKey: `execute:${job.id}:${key}`,
                kind: "execute",
                status: "pending",
                attempts: 0,
                leaseUntil: null,
                nextAttemptAt: null,
                sentAt: null,
                lastError: null,
                payload: { jobId: job.id, runId: run.id },
            }),
        );
        return run;
    }

    async findInScope(context: AutomationScopeContext, id: string): Promise<AutomationJob> {
        const account = await this.findScopeAccount(context);
        if (!account) throw HttpErrorFactory.notFound("Task not found");
        this.assertAccountTenant(account, context.tenantId);
        const job = await this.jobRepository.findOne({
            where: {
                id,
                creatorId: context.actorId,
                channel: context.channel,
                channelAccountId: account.id,
                tenantId: context.tenantId || IsNull(),
                conversationId: context.conversationId,
            },
        });
        if (!job) throw HttpErrorFactory.notFound("Task not found");
        return job;
    }

    async findForCreator(
        creatorId: string,
        id: string,
        options: { withDeleted?: boolean } = {},
    ): Promise<AutomationJob> {
        const ownedAgents = await this.agentRepository.find({ where: { createBy: creatorId } });
        const job = await this.jobRepository.findOne({
            ...(options.withDeleted ? { withDeleted: true } : {}),
            where: automationCreatorFilters(
                creatorId,
                ownedAgents.map((agent) => String(agent.id)),
            ).map((filter) => ({ id, ...filter })),
        });
        if (!job) throw HttpErrorFactory.notFound("Task not found");
        return job;
    }

    async detailForCreator(creatorId: string, id: string): Promise<Record<string, unknown>> {
        const job = await this.findForCreator(creatorId, id);
        return (await this.toPublicTasks([job]))[0] || {};
    }

    async transitionForCreator(
        creatorId: string,
        id: string,
        operation: "pause" | "resume" | "cancel",
        expectedUpdatedAt?: string,
    ): Promise<Record<string, unknown>> {
        if (!["pause", "resume", "cancel"].includes(operation))
            throw HttpErrorFactory.badRequest("Unsupported task operation");
        const job = await this.findForCreator(creatorId, id, {
            withDeleted: operation === "cancel",
        });
        this.assertExpectedUpdatedAt(job, expectedUpdatedAt);
        if (operation === "pause" && job.status === "active") job.status = "paused";
        if (operation === "resume" && job.status === "paused") job.status = "active";
        if (operation === "cancel" && !["cancelled", "completed"].includes(job.status))
            job.status = "cancelled";
        const saved = await this.jobRepository.save(job);
        if (operation === "cancel" && saved.status === "cancelled" && !saved.deletedAt) {
            // Web deletion keeps the cancelled terminal state and audit rows while hiding the
            // task definition from subsequent creator-workspace reads.
            await this.jobRepository.softRemove(saved);
        }
        return (await this.toPublicTasks([saved]))[0] || {};
    }

    async runOnceForCreator(
        creatorId: string,
        id: string,
        idempotencyKey: string,
    ): Promise<AutomationRun> {
        const job = await this.findForCreator(creatorId, id);
        if (["cancelled", "completed"].includes(job.status)) {
            throw HttpErrorFactory.conflict("Terminal task cannot be run");
        }
        const occurrence = new Date();
        const key = `manual:${idempotencyKey}`;
        const existing = await this.runRepository.findOne({
            where: { jobId: job.id, occurrenceKey: key },
        });
        if (existing) return existing;
        const run = await this.runRepository.save(
            this.runRepository.create({
                jobId: job.id,
                occurrenceKey: key,
                trigger: "manual",
                status: "pending",
                scheduledAt: occurrence,
                startedAt: null,
                finishedAt: null,
                attempt: 0,
                conversationId: null,
                resultPreview: null,
                errorPreview: null,
                deliveryStatus: "pending",
                providerMessageId: null,
                retentionUntil: null,
            }),
        );
        await this.dispatchRepository.save(
            this.dispatchRepository.create({
                jobId: job.id,
                runId: run.id,
                dispatchKey: `execute:${job.id}:${key}`,
                kind: "execute",
                status: "pending",
                attempts: 0,
                leaseUntil: null,
                nextAttemptAt: null,
                sentAt: null,
                lastError: null,
                payload: { jobId: job.id, runId: run.id },
            }),
        );
        return run;
    }

    async getJobById(id: string): Promise<AutomationJob | null> {
        return this.jobRepository.findOne({ where: { id } });
    }

    async detailForScope(
        context: AutomationScopeContext,
        id: string,
    ): Promise<Record<string, unknown>> {
        const job = await this.findInScope(context, id);
        return (await this.toPublicTasks([job]))[0] || {};
    }

    async executeRun(runId: string): Promise<AutomationExecutionResult> {
        const run = await this.runRepository.findOne({ where: { id: runId }, relations: ["job"] });
        if (!run?.job) throw new Error("Automation run not found");
        const job = run.job;
        if (run.status === "succeeded" || run.status === "cancelled")
            return { answer: run.resultPreview || "" };
        run.status = "running";
        run.attempt += 1;
        run.startedAt = new Date();
        await this.runRepository.save(run);
        try {
            const result = await this.executor.execute({
                agentId: job.agentId,
                jobId: job.id,
                runId: run.id,
                prompt: job.prompt,
                conversationId: run.conversationId,
                timeoutSeconds: job.timeoutSeconds,
                accountId: (job.deliveryTarget as { accountId?: string })?.accountId,
                toolPolicy: job.toolPolicy as any,
            });
            run.status = "succeeded";
            run.resultPreview = result.answer.slice(0, PREVIEW_LENGTH);
            run.conversationId = result.conversationId || run.conversationId;
            run.finishedAt = new Date();
            await this.runRepository.save(run);
            return result;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const unknownOutcome = Boolean(
                (error as Error & { unknownOutcome?: boolean }).unknownOutcome,
            );
            run.status = unknownOutcome
                ? "unknown"
                : message.includes("timed out")
                  ? "timed_out"
                  : "failed";
            run.errorPreview = message.slice(0, 1000);
            run.finishedAt = new Date();
            await this.runRepository.save(run);
            this.logger.warn(`Automation run ${run.id} failed: ${message}`);
            if (unknownOutcome) return { answer: "" };
            throw error;
        }
    }

    async claimDueJobs(now = new Date(), limit = 50): Promise<number> {
        const jobs = await this.jobRepository
            .createQueryBuilder("job")
            .where("job.status = :status", { status: "active" })
            .andWhere("job.nextRunAt <= :now", { now })
            .orderBy("job.nextRunAt", "ASC")
            .take(limit)
            .getMany();
        let claimed = 0;
        for (const candidate of jobs) {
            const runner = this.dataSource.createQueryRunner();
            await runner.connect();
            try {
                await runner.startTransaction();
                const job = await runner.manager
                    .createQueryBuilder(AutomationJob, "job")
                    .setLock("pessimistic_write")
                    .setOnLocked("skip_locked")
                    .where("job.id = :id", { id: candidate.id })
                    .getOne();
                if (!job || job.status !== "active" || job.nextRunAt > now) {
                    await runner.rollbackTransaction();
                    continue;
                }
                const scheduledAt = job.nextRunAt;
                const schedule = parseSchedule(job.schedule, {
                    now: new Date(scheduledAt.getTime() - 1000),
                });
                const key = occurrenceKey(schedule, scheduledAt);
                const run = runner.manager.create(AutomationRun, {
                    jobId: job.id,
                    occurrenceKey: key,
                    trigger: "scheduled",
                    status: "pending",
                    scheduledAt,
                    attempt: 0,
                    deliveryStatus: "pending",
                    startedAt: null,
                    finishedAt: null,
                    conversationId: null,
                    resultPreview: null,
                    errorPreview: null,
                    providerMessageId: null,
                    retentionUntil: null,
                });
                const savedRun = await runner.manager.save(run);
                await runner.manager.save(
                    runner.manager.create(AutomationDispatch, {
                        jobId: job.id,
                        runId: savedRun.id,
                        dispatchKey: `execute:${job.id}:${key}`,
                        kind: "execute",
                        status: "pending",
                        attempts: 0,
                        leaseUntil: null,
                        nextAttemptAt: null,
                        sentAt: null,
                        lastError: null,
                        payload: { jobId: job.id, runId: savedRun.id },
                    }),
                );
                const next = nextOccurrence(schedule, scheduledAt);
                if (next) {
                    job.lastRunAt = scheduledAt;
                    job.nextRunAt = next;
                } else {
                    job.status = "paused";
                    job.lastRunAt = scheduledAt;
                    job.nextRunAt = new Date("9999-12-31T23:59:59.999Z");
                }
                await runner.manager.save(job);
                await runner.commitTransaction();
                claimed += 1;
            } catch (error) {
                await runner.rollbackTransaction().catch(() => undefined);
                if (!(error as any)?.code?.toString().includes("23505"))
                    this.logger.warn(`Due job claim failed: ${(error as Error).message}`);
            } finally {
                await runner.release();
            }
        }
        return claimed;
    }

    async reconcileMissedJobs(now = new Date(), limit = 50): Promise<number> {
        const jobs = await this.jobRepository.find({
            where: { status: "active" },
            order: { nextRunAt: "ASC" },
            take: limit,
        });
        let reconciled = 0;
        for (const job of jobs) {
            if (job.nextRunAt > now) continue;
            const age = now.getTime() - job.nextRunAt.getTime();
            if (job.missedRunPolicy === "skip") {
                const schedule = parseSchedule(job.schedule, {
                    now: new Date(job.nextRunAt.getTime() - 1000),
                });
                const next = nextOccurrence(schedule, now);
                if (next) {
                    job.nextRunAt = next;
                    await this.jobRepository.save(job);
                    reconciled += 1;
                }
                continue;
            }
            if (job.missedRunPolicy === "fire_once" && age > 86_400_000) {
                await this.claimDueJobs(now, 1);
                reconciled += 1;
            }
        }
        return reconciled;
    }

    async stats() {
        const [active, pending, leased, unknown, oldestDue] = await Promise.all([
            this.jobRepository.count({ where: { status: "active" } }),
            this.dispatchRepository.count({ where: { status: "pending" } }),
            this.dispatchRepository.count({ where: { status: "leased" } }),
            this.dispatchRepository.count({ where: { status: "unknown" } }),
            this.jobRepository
                .createQueryBuilder("job")
                .select("MIN(job.nextRunAt)", "oldest")
                .where("job.status = :status AND job.nextRunAt <= now()", { status: "active" })
                .getRawOne<{ oldest: Date | null }>(),
        ]);
        const oldest = oldestDue?.oldest ? new Date(oldestDue.oldest).getTime() : null;
        return {
            schedulerActive: true,
            activeJobs: active,
            pendingDispatches: pending,
            leasedDispatches: leased,
            unknownDispatches: unknown,
            oldestDueLagSeconds: oldest ? Math.max(0, Math.floor((Date.now() - oldest) / 1000)) : 0,
        };
    }

    async listRuns(jobId?: string): Promise<AutomationRun[]> {
        return this.runRepository.find({
            where: jobId ? { jobId } : undefined,
            order: { createdAt: "DESC" },
            take: 100,
        });
    }

    async listForConsole(): Promise<Array<Record<string, unknown>>> {
        const jobs = await this.jobRepository.find({ order: { nextRunAt: "ASC" }, take: 500 });
        return this.toPublicTasks(jobs);
    }

    private async toPublicTasks(jobs: AutomationJob[]): Promise<Array<Record<string, unknown>>> {
        if (jobs.length === 0) return [];
        const jobIds = jobs.map((job) => job.id);
        const [runs, dispatches] = await Promise.all([
            this.runRepository
                .createQueryBuilder("run")
                .distinctOn(["run.jobId"])
                .where("run.jobId IN (:...jobIds)", { jobIds })
                .orderBy("run.jobId", "ASC")
                .addOrderBy("run.createdAt", "DESC")
                .getMany(),
            this.dispatchRepository
                .createQueryBuilder("dispatch")
                .distinctOn(["dispatch.jobId"])
                .where("dispatch.jobId IN (:...jobIds)", { jobIds })
                .orderBy("dispatch.jobId", "ASC")
                .addOrderBy("dispatch.createdAt", "DESC")
                .getMany(),
        ]);
        const latestRunByJob = new Map<string, AutomationRun>();
        const latestDispatchByJob = new Map<string, AutomationDispatch>();
        for (const run of runs)
            if (!latestRunByJob.has(run.jobId)) latestRunByJob.set(run.jobId, run);
        for (const dispatch of dispatches)
            if (!latestDispatchByJob.has(dispatch.jobId))
                latestDispatchByJob.set(dispatch.jobId, dispatch);
        return jobs.map((job) => {
            const run = latestRunByJob.get(job.id);
            const dispatch = latestDispatchByJob.get(job.id);
            return {
                id: job.id,
                name: job.name,
                updatedAt: job.updatedAt,
                agentId: job.agentId,
                prompt: job.prompt,
                scheduleKind: job.scheduleKind,
                schedule: job.schedule,
                timezone: job.timezone,
                channel: job.channel,
                status: job.status,
                nextRunAt: job.nextRunAt,
                lastRunAt: job.lastRunAt,
                creatorId: job.creatorId,
                deliveryStatus: run?.deliveryStatus || "pending",
                lastRunStatus: run?.status,
                lastRunResultPreview: run?.resultPreview || null,
                lastRunErrorPreview: run?.errorPreview || null,
                dispatchStatus: dispatch?.status,
                deleteAfterRun: job.deleteAfterRun,
                missedRunPolicy: job.missedRunPolicy,
                overlapPolicy: job.overlapPolicy,
                timeoutSeconds: job.timeoutSeconds,
            };
        });
    }

    private async updateJob(
        job: AutomationJob,
        input: UpdateAutomationInput,
    ): Promise<AutomationJob> {
        if (["cancelled", "completed"].includes(job.status)) {
            throw HttpErrorFactory.conflict("Terminal task cannot be updated");
        }
        this.assertExpectedUpdatedAt(job, input.expectedUpdatedAt);
        if (input.name !== undefined) {
            const name = input.name.trim();
            if (!name) throw HttpErrorFactory.badRequest("Task name is required");
            job.name = name.slice(0, 200);
        }
        if (input.prompt !== undefined) {
            const prompt = input.prompt.trim();
            if (!prompt) throw HttpErrorFactory.badRequest("Prompt is required");
            if (prompt.length > MAX_PROMPT_LENGTH)
                throw HttpErrorFactory.badRequest("Prompt is too long");
            job.prompt = prompt;
        }
        if (input.schedule !== undefined) {
            let schedule: AutomationSchedule;
            try {
                schedule = parseSchedule(input.schedule);
            } catch (error) {
                throw HttpErrorFactory.badRequest(
                    error instanceof Error ? error.message : "Invalid schedule",
                );
            }
            const nextRunAt = nextOccurrence(schedule, new Date(Date.now() - 1000));
            if (!nextRunAt) throw HttpErrorFactory.badRequest("Schedule has no future occurrence");
            job.scheduleKind = schedule.kind;
            job.schedule = schedule as unknown as Record<string, unknown>;
            job.timezone =
                schedule.kind === "cron"
                    ? schedule.timezone
                    : schedule.kind === "every"
                      ? schedule.timezone || "UTC"
                      : "UTC";
            job.nextRunAt = nextRunAt;
        }
        if (input.deleteAfterRun !== undefined) job.deleteAfterRun = input.deleteAfterRun;
        if (input.missedRunPolicy !== undefined) {
            if (!["fire_once", "skip", "catch_up"].includes(input.missedRunPolicy)) {
                throw HttpErrorFactory.badRequest("Unsupported missed run policy");
            }
            job.missedRunPolicy = input.missedRunPolicy;
        }
        if (input.overlapPolicy !== undefined) {
            if (!["skip", "queue_one", "allow"].includes(input.overlapPolicy)) {
                throw HttpErrorFactory.badRequest("Unsupported overlap policy");
            }
            job.overlapPolicy = input.overlapPolicy;
        }
        if (input.timeoutSeconds !== undefined) {
            if (
                !Number.isInteger(input.timeoutSeconds) ||
                input.timeoutSeconds < 1 ||
                input.timeoutSeconds > 86_400
            ) {
                throw HttpErrorFactory.badRequest("Timeout must be between 1 and 86400 seconds");
            }
            job.timeoutSeconds = input.timeoutSeconds;
        }
        return this.jobRepository.save(job);
    }

    private assertExpectedUpdatedAt(job: AutomationJob, expectedUpdatedAt?: string): void {
        if (!expectedUpdatedAt) return;
        const expected = Date.parse(expectedUpdatedAt);
        if (Number.isNaN(expected) || job.updatedAt.getTime() !== expected) {
            throw HttpErrorFactory.conflict("Task changed; refresh before updating");
        }
    }

    private findScopeAccount(context: AutomationScopeContext): Promise<ChannelAccount | null> {
        return this.accountRepository.findOne({
            where: {
                provider: context.channel,
                accountKey: context.accountId,
            },
        });
    }

    private assertAccountTenant(account: ChannelAccount | null, tenantId?: string): void {
        if (account?.tenantRef && account.tenantRef !== tenantId) {
            throw HttpErrorFactory.forbidden("Channel account is outside the current tenant scope");
        }
    }

    async listDispatches(
        status?: AutomationDispatch["status"],
    ): Promise<Array<Record<string, unknown>>> {
        const dispatches = await this.dispatchRepository.find({
            where: status ? { status } : undefined,
            order: { createdAt: "DESC" },
            take: 100,
        });
        return dispatches.map((dispatch) => this.toPublicDispatch(dispatch));
    }

    async recoverDispatch(
        id: string,
        action: "retry" | "dismiss",
    ): Promise<Record<string, unknown>> {
        const dispatch = await this.dispatchRepository.findOne({ where: { id } });
        if (!dispatch) throw HttpErrorFactory.notFound("Dispatch not found");
        if (action === "dismiss") {
            dispatch.status = "dismissed";
        } else if (dispatch.status !== "sent") {
            dispatch.status = "pending";
            dispatch.leaseUntil = null;
            dispatch.nextAttemptAt = new Date();
        }
        return this.toPublicDispatch(await this.dispatchRepository.save(dispatch));
    }

    private toPublicDispatch(dispatch: AutomationDispatch): Record<string, unknown> {
        return {
            id: dispatch.id,
            createdAt: dispatch.createdAt,
            jobId: dispatch.jobId,
            runId: dispatch.runId,
            dispatchKey: dispatch.dispatchKey,
            kind: dispatch.kind,
            status: dispatch.status,
            attempts: dispatch.attempts,
            leaseUntil: dispatch.leaseUntil,
            nextAttemptAt: dispatch.nextAttemptAt,
            sentAt: dispatch.sentAt,
            lastError: dispatch.lastError,
            payload: {},
        };
    }
}
