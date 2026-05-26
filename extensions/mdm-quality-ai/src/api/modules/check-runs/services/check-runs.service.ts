import { InjectRepository } from "@buildingai/db/@nestjs/typeorm";
import { Repository } from "@buildingai/db/typeorm";
import { HttpErrorFactory } from "@buildingai/errors";
import { Injectable } from "@nestjs/common";

import { CheckResult } from "../../../db/entities/check-result.entity";
import { CheckRunItem } from "../../../db/entities/check-run-item.entity";
import { CheckRun } from "../../../db/entities/check-run.entity";
import { resolveTimestampForStatus } from "../../../shared/anomaly-status";
import { parseCheckResponse } from "../../../shared/parse-check-response";
import { RulesService } from "../../rules/services/rules.service";
import { IngestRuleDto } from "../dto/ingest-rule.dto";

@Injectable()
export class CheckRunsService {
    constructor(
        @InjectRepository(CheckRun) private readonly runsRepo: Repository<CheckRun>,
        @InjectRepository(CheckRunItem) private readonly itemsRepo: Repository<CheckRunItem>,
        @InjectRepository(CheckResult) private readonly resultsRepo: Repository<CheckResult>,
        private readonly rulesService: RulesService,
    ) {}

    async start(): Promise<{ runId: number; items: CheckRunItem[] }> {
        const running = await this.runsRepo.findOne({ where: { status: "running" } });
        if (running) {
            throw HttpErrorFactory.badRequest("A check run is already in progress");
        }
        const enabled = await this.rulesService.listEnabled();
        if (enabled.length === 0) {
            throw HttpErrorFactory.badRequest("No enabled rules to check");
        }
        const run = await this.runsRepo.save(this.runsRepo.create({ status: "running" }));
        const items = await this.itemsRepo.save(
            enabled.map((rule) =>
                this.itemsRepo.create({
                    runId: run.id,
                    ruleId: rule.ruleId,
                    status: "pending",
                }),
            ),
        );
        return { runId: run.id, items };
    }

    async get(runId: number) {
        const run = await this.getRun(runId);
        const items = await this.itemsRepo.find({ where: { runId }, order: { id: "ASC" } });
        return { run, items };
    }

    async findRunning(): Promise<CheckRun | null> {
        return this.runsRepo.findOne({ where: { status: "running" } });
    }

    async getProgress(runId?: number) {
        const run =
            runId != null
                ? await this.runsRepo.findOne({ where: { id: runId } })
                : await this.findRunning();
        if (!run) {
            return {
                ok: true as const,
                hasRun: false,
                message: runId != null ? `Check run ${runId} not found` : "No check run in progress",
            };
        }
        const items = await this.itemsRepo.find({ where: { runId: run.id }, order: { id: "ASC" } });
        const done = items.filter((i) => i.status === "done").length;
        const failed = items.filter((i) => i.status === "failed").length;
        const pending = items.filter((i) => i.status === "pending").length;
        const total = items.length;
        const finished = done + failed;
        return {
            ok: true as const,
            hasRun: true,
            runId: run.id,
            status: run.status,
            startedAt: run.createTime,
            finishedAt: run.finishedAt,
            total,
            done,
            failed,
            pending,
            percentComplete: total > 0 ? Math.round((finished / total) * 100) : 0,
            items: items.map((i) => ({
                ruleId: i.ruleId,
                status: i.status,
                errorMessage: i.errorMessage,
            })),
        };
    }

    async cancelActive(runId?: number) {
        const run =
            runId != null ? await this.runsRepo.findOne({ where: { id: runId } }) : await this.findRunning();
        if (!run) {
            return {
                ok: false as const,
                error: runId != null ? `Check run ${runId} not found` : "No check run in progress",
            };
        }
        if (run.status !== "running") {
            return {
                ok: false as const,
                runId: run.id,
                status: run.status,
                error: `Check run is already ${run.status}`,
            };
        }
        const saved = await this.cancel(run.id);
        return {
            ok: true as const,
            runId: saved.id,
            status: saved.status,
            finishedAt: saved.finishedAt,
        };
    }

    async cancel(runId: number) {
        const run = await this.getRun(runId);
        if (run.status !== "running") {
            return run;
        }
        run.status = "cancelled";
        run.finishedAt = new Date();
        return this.runsRepo.save(run);
    }

    async ingest(runId: number, ruleId: string, dto: IngestRuleDto) {
        const run = await this.getRun(runId);
        if (run.status !== "running") {
            throw HttpErrorFactory.badRequest("Check run is not active");
        }
        const item = await this.itemsRepo.findOne({ where: { runId, ruleId } });
        if (!item) {
            throw HttpErrorFactory.notFound(`Run item for rule ${ruleId} not found`);
        }

        item.conversationId = dto.conversationId ?? item.conversationId;
        const parsed = parseCheckResponse(dto.assistantText, ruleId);
        if (!parsed.ok) {
            item.status = "failed";
            item.errorMessage = parsed.error;
            await this.itemsRepo.save(item);
            await this.tryCompleteRun(runId);
            return { ok: false as const, error: parsed.error };
        }

        const now = new Date();
        for (const a of parsed.data.anomalies) {
            const existing = await this.resultsRepo.findOne({ where: { anomalyId: a.anomalyId } });
            if (existing) {
                continue;
            }
            await this.resultsRepo.save(
                this.resultsRepo.create({
                    anomalyId: a.anomalyId,
                    ruleId: parsed.data.ruleId,
                    description: a.description,
                    riskLevel: a.riskLevel,
                    rootCause: a.rootCauseAnalysis ?? null,
                    solution: a.solution ?? null,
                    status: a.status,
                    autoFixed: a.autoFixed ?? false,
                    checkTime: now,
                    resolvedAt: resolveTimestampForStatus(a.status),
                }),
            );
        }

        item.status = "done";
        item.errorMessage = null;
        await this.itemsRepo.save(item);
        await this.tryCompleteRun(runId);
        return {
            ok: true as const,
            anomalyCount: parsed.data.anomalies.length,
        };
    }

    private async tryCompleteRun(runId: number) {
        const items = await this.itemsRepo.find({ where: { runId } });
        const terminal = items.every((i) => i.status === "done" || i.status === "failed");
        if (!terminal) {
            return;
        }
        const run = await this.getRun(runId);
        if (run.status === "running") {
            run.status = "completed";
            run.finishedAt = new Date();
            await this.runsRepo.save(run);
        }
    }

    private async getRun(runId: number): Promise<CheckRun> {
        const run = await this.runsRepo.findOne({ where: { id: runId } });
        if (!run) {
            throw HttpErrorFactory.notFound(`Check run ${runId} not found`);
        }
        return run;
    }

    private async nextAnomalyId(): Promise<string> {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const prefix = `ANOM-${date}-`;
        const rows = await this.resultsRepo
            .createQueryBuilder("r")
            .where("r.anomaly_id LIKE :prefix", { prefix: `${prefix}%` })
            .getMany();
        let max = 0;
        for (const r of rows) {
            const m = new RegExp(`^${prefix}(\\d+)$`).exec(r.anomalyId);
            if (m) {
                max = Math.max(max, Number(m[1]));
            }
        }
        return `${prefix}${String(max + 1).padStart(3, "0")}`;
    }
}
