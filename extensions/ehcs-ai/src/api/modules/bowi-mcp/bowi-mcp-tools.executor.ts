import { Injectable } from "@nestjs/common";

import { BowiCheckRunsService } from "./bowi-check-runs.service";
import { BowiSqlService } from "./bowi-sql.service";

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
export class BowiMcpToolsExecutor {
    constructor(
        private readonly checkRuns: BowiCheckRunsService,
        private readonly sql: BowiSqlService,
    ) {}

    async call(name: string, args: Record<string, unknown> | undefined): Promise<unknown> {
        const appId = args?.appId;
        switch (name) {
            case "bowi_start_full_check":
                return this.checkRuns.startFullCheck(appId);
            case "bowi_get_check_progress":
                return this.checkRuns.getProgress(appId, parseRunId(args?.runId));
            case "bowi_cancel_check":
                return this.checkRuns.cancelActive(appId, parseRunId(args?.runId));
            case "bowi_ingest_rule_result": {
                const runId = parseRunId(args?.runId);
                const ruleId = args?.ruleId;
                const assistantText = args?.assistantText;
                if (
                    runId === undefined ||
                    typeof ruleId !== "string" ||
                    typeof assistantText !== "string"
                ) {
                    return {
                        ok: false,
                        error: "appId, runId, ruleId, and assistantText are required",
                    };
                }
                return this.checkRuns.ingest(appId, runId, ruleId, assistantText);
            }
            case "bowi_sql_query": {
                const sql = args?.sql;
                if (typeof sql !== "string" || !sql.trim()) {
                    return { ok: false, error: "appId and sql are required" };
                }
                try {
                    const params = Array.isArray(args?.params) ? args.params : undefined;
                    return await this.sql.query(appId, sql, params);
                } catch (e) {
                    return { ok: false, error: e instanceof Error ? e.message : "Query failed" };
                }
            }
            case "bowi_sql_execute": {
                const sql = args?.sql;
                if (typeof sql !== "string" || !sql.trim()) {
                    return { ok: false, error: "appId and sql are required" };
                }
                try {
                    const params = Array.isArray(args?.params) ? args.params : undefined;
                    return await this.sql.execute(appId, sql, params);
                } catch (e) {
                    return { ok: false, error: e instanceof Error ? e.message : "Execute failed" };
                }
            }
            default:
                return { ok: false, error: `Unknown tool: ${name}` };
        }
    }
}
