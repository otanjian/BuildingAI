import { qualifyTable, type BowiAppScope } from "@buildingai/constants/shared/bowi-app-scopes";
import { InjectDataSource } from "@buildingai/db/@nestjs/typeorm";
import { DataSource } from "@buildingai/db/typeorm";
import { Injectable } from "@nestjs/common";

import { parseCheckResponse } from "../../shared/parse-check-response";
import { resolveTimestampForStatus } from "../../shared/anomaly-status";
import { BowiAppScopeService } from "./bowi-app-scope.service";

function parseRunId(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        return Math.trunc(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return undefined;
}

@Injectable()
export class BowiCheckRunsService {
    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly scopeService: BowiAppScopeService,
    ) {}

    async startFullCheck(appId: unknown) {
        const scope = this.scopeService.resolve(appId);
        const runs = qualifyTable(scope, scope.tables.checkRuns);
        const items = qualifyTable(scope, scope.tables.checkRunItems);
        const rules = qualifyTable(scope, scope.tables.checkRules);

        const running: { id: number }[] = await this.dataSource.query(
            `SELECT id FROM ${runs} WHERE status = $1 LIMIT 1`,
            ["running"],
        );
        if (running.length > 0) {
            return { ok: false, error: "A check run is already in progress", appId: scope.appId };
        }

        const enabled: Array<{
            rule_id: string;
            business_domain: string;
            data_item: string;
            rule_description: string;
            severity: string;
            deduct_score: number;
            auto_fix: boolean;
        }> = await this.dataSource.query(
            `SELECT rule_id, business_domain, data_item, rule_description, severity, deduct_score, auto_fix
             FROM ${rules} WHERE enabled = true ORDER BY rule_id ASC`,
        );
        if (enabled.length === 0) {
            return {
                ok: false,
                error: "No enabled rules to check",
                appId: scope.appId,
                ruleCount: 0,
                rules: [],
            };
        }

        const inserted: { id: number }[] = await this.dataSource.query(
            `INSERT INTO ${runs} (status) VALUES ($1) RETURNING id`,
            ["running"],
        );
        const runId = inserted[0]!.id;

        for (const rule of enabled) {
            await this.dataSource.query(
                `INSERT INTO ${items} (run_id, rule_id, status) VALUES ($1, $2, $3)`,
                [runId, rule.rule_id, "pending"],
            );
        }

        return {
            ok: true,
            appId: scope.appId,
            runId,
            ruleCount: enabled.length,
            rules: enabled.map((r) => ({
                ruleId: r.rule_id,
                businessDomain: r.business_domain,
                dataItem: r.data_item,
                ruleDescription: r.rule_description,
                severity: r.severity,
                deductScore: r.deduct_score,
                autoFix: r.auto_fix,
            })),
        };
    }

    async getProgress(appId: unknown, runIdArg?: number) {
        const scope = this.scopeService.resolve(appId);
        const runs = qualifyTable(scope, scope.tables.checkRuns);
        const items = qualifyTable(scope, scope.tables.checkRunItems);

        const runId = runIdArg;
        let run: { id: number; status: string; create_time: Date; finished_at: Date | null } | undefined;
        if (runId != null) {
            const rows = await this.dataSource.query(
                `SELECT id, status, create_time, finished_at FROM ${runs} WHERE id = $1`,
                [runId],
            );
            run = rows[0];
        } else {
            const rows = await this.dataSource.query(
                `SELECT id, status, create_time, finished_at FROM ${runs} WHERE status = $1 LIMIT 1`,
                ["running"],
            );
            run = rows[0];
        }

        if (!run) {
            return {
                ok: true,
                hasRun: false,
                appId: scope.appId,
                message:
                    runId != null
                        ? `Check run ${runId} not found`
                        : "No check run in progress",
            };
        }

        const itemRows: Array<{
            rule_id: string;
            status: string;
            error_message: string | null;
        }> = await this.dataSource.query(
            `SELECT rule_id, status, error_message FROM ${items} WHERE run_id = $1 ORDER BY id ASC`,
            [run.id],
        );

        const done = itemRows.filter((i) => i.status === "done").length;
        const failed = itemRows.filter((i) => i.status === "failed").length;
        const pending = itemRows.filter((i) => i.status === "pending").length;
        const total = itemRows.length;
        const finished = done + failed;

        return {
            ok: true,
            hasRun: true,
            appId: scope.appId,
            runId: run.id,
            status: run.status,
            startedAt: run.create_time,
            finishedAt: run.finished_at,
            total,
            done,
            failed,
            pending,
            percentComplete: total > 0 ? Math.round((finished / total) * 100) : 0,
            items: itemRows.map((i) => ({
                ruleId: i.rule_id,
                status: i.status,
                errorMessage: i.error_message,
            })),
        };
    }

    async cancelActive(appId: unknown, runIdArg?: number) {
        const scope = this.scopeService.resolve(appId);
        const runs = qualifyTable(scope, scope.tables.checkRuns);

        let run: { id: number; status: string; finished_at: Date | null } | undefined;
        if (runIdArg != null) {
            const rows = await this.dataSource.query(
                `SELECT id, status, finished_at FROM ${runs} WHERE id = $1`,
                [runIdArg],
            );
            run = rows[0];
        } else {
            const rows = await this.dataSource.query(
                `SELECT id, status, finished_at FROM ${runs} WHERE status = $1 LIMIT 1`,
                ["running"],
            );
            run = rows[0];
        }

        if (!run) {
            return {
                ok: false,
                appId: scope.appId,
                error:
                    runIdArg != null
                        ? `Check run ${runIdArg} not found`
                        : "No check run in progress",
            };
        }
        if (run.status !== "running") {
            return {
                ok: false,
                appId: scope.appId,
                runId: run.id,
                status: run.status,
                error: `Check run is already ${run.status}`,
            };
        }

        const updated: { id: number; status: string; finished_at: Date }[] =
            await this.dataSource.query(
                `UPDATE ${runs} SET status = $1, finished_at = NOW(), update_time = NOW() WHERE id = $2 RETURNING id, status, finished_at`,
                ["cancelled", run.id],
            );
        const saved = updated[0]!;
        return {
            ok: true,
            appId: scope.appId,
            runId: saved.id,
            status: saved.status,
            finishedAt: saved.finished_at,
        };
    }

    async ingest(
        appId: unknown,
        runId: number,
        ruleId: string,
        assistantText: string,
    ) {
        const scope = this.scopeService.resolve(appId);
        const runs = qualifyTable(scope, scope.tables.checkRuns);
        const items = qualifyTable(scope, scope.tables.checkRunItems);
        const results = qualifyTable(scope, scope.tables.checkResults);

        const runRows = await this.dataSource.query(
            `SELECT id, status FROM ${runs} WHERE id = $1`,
            [runId],
        );
        if (runRows.length === 0) {
            return { ok: false, error: `Check run ${runId} not found`, appId: scope.appId };
        }
        if (runRows[0].status !== "running") {
            return { ok: false, error: "Check run is not active", appId: scope.appId };
        }

        const itemRows = await this.dataSource.query(
            `SELECT id FROM ${items} WHERE run_id = $1 AND rule_id = $2`,
            [runId, ruleId],
        );
        if (itemRows.length === 0) {
            return {
                ok: false,
                error: `Run item for rule ${ruleId} not found`,
                appId: scope.appId,
            };
        }

        const parsed = parseCheckResponse(assistantText, ruleId);
        if (!parsed.ok) {
            await this.dataSource.query(
                `UPDATE ${items} SET status = $1, error_message = $2, update_time = NOW() WHERE run_id = $3 AND rule_id = $4`,
                ["failed", parsed.error, runId, ruleId],
            );
            await this.tryCompleteRun(scope, runId);
            return { ok: false, error: parsed.error, appId: scope.appId };
        }

        const now = new Date();
        for (const a of parsed.data.anomalies) {
            const existing = await this.dataSource.query(
                `SELECT id FROM ${results} WHERE anomaly_id = $1`,
                [a.anomalyId],
            );
            if (existing.length > 0) {
                continue;
            }
            await this.dataSource.query(
                `INSERT INTO ${results} (anomaly_id, rule_id, description, risk_level, root_cause, solution, status, auto_fixed, check_time, resolved_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    a.anomalyId,
                    parsed.data.ruleId,
                    a.description,
                    a.riskLevel,
                    a.rootCauseAnalysis ?? null,
                    a.solution ?? null,
                    a.status,
                    a.autoFixed ?? false,
                    now,
                    resolveTimestampForStatus(a.status),
                ],
            );
        }

        await this.dataSource.query(
            `UPDATE ${items} SET status = $1, error_message = NULL, update_time = NOW() WHERE run_id = $2 AND rule_id = $3`,
            ["done", runId, ruleId],
        );
        await this.tryCompleteRun(scope, runId);

        return {
            ok: true,
            appId: scope.appId,
            anomalyCount: parsed.data.anomalies.length,
        };
    }

    private async tryCompleteRun(scope: BowiAppScope, runId: number) {
        const items = qualifyTable(scope, scope.tables.checkRunItems);
        const runs = qualifyTable(scope, scope.tables.checkRuns);

        const itemRows: Array<{ status: string }> = await this.dataSource.query(
            `SELECT status FROM ${items} WHERE run_id = $1`,
            [runId],
        );
        const terminal = itemRows.every(
            (i) => i.status === "done" || i.status === "failed",
        );
        if (!terminal) {
            return;
        }

        await this.dataSource.query(
            `UPDATE ${runs} SET status = $1, finished_at = NOW(), update_time = NOW() WHERE id = $2 AND status = $3`,
            ["completed", runId, "running"],
        );
    }
}
