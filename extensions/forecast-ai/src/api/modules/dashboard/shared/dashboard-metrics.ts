import { computeHealthScore, countPendingByRisk } from "../../../shared/health-score";
import type { CheckResult } from "../../../db/entities/check-result.entity";
import type { CheckRule } from "../../../db/entities/check-rule.entity";
import type { CheckRun } from "../../../db/entities/check-run.entity";
import type { CheckRunItem } from "../../../db/entities/check-run-item.entity";
import type { RcaSession } from "../../../db/entities/rca-session.entity";

export function startOfDay(d = new Date()): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

export function isSameCalendarDay(a: Date, day: Date): boolean {
    const t = new Date(a);
    return (
        t.getFullYear() === day.getFullYear() &&
        t.getMonth() === day.getMonth() &&
        t.getDate() === day.getDate()
    );
}

export function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

const RESOLVED_STATUSES = new Set(["已解决", "ai自动修复"]);

export function isResolvedStatus(status: string): boolean {
    return RESOLVED_STATUSES.has(status);
}

export function buildSummaryMetrics(
    rules: CheckRule[],
    results: CheckResult[],
    runs: CheckRun[],
    rcaSessions: RcaSession[],
) {
    const todayStart = startOfDay();
    const enabledCount = rules.filter((r) => r.enabled).length;
    const pending = results.filter((r) => r.status === "待解决");
    const highRiskPending = pending.filter((r) => r.riskLevel === "高").length;
    const riskCounts = countPendingByRisk(results);
    const healthScore = computeHealthScore(riskCounts);

    const resultsBeforeToday = results.filter((r) => new Date(r.createTime) < todayStart);
    const healthScoreYesterday = computeHealthScore(countPendingByRisk(resultsBeforeToday));
    const healthScoreDelta = Number((healthScore - healthScoreYesterday).toFixed(1));

    const autoFixed = results.filter((r) => r.autoFixed).length;
    const autoFixRate = results.length ? Math.round((autoFixed / results.length) * 100) : 0;
    const beforeToday = results.filter((r) => new Date(r.createTime) < todayStart);
    const autoFixedBefore = beforeToday.filter((r) => r.autoFixed).length;
    const autoFixRateBefore = beforeToday.length
        ? Math.round((autoFixedBefore / beforeToday.length) * 100)
        : 0;
    const autoFixRateDelta = autoFixRate - autoFixRateBefore;

    const runsToday = runs.filter((r) => new Date(r.createTime) >= todayStart).length;
    const runningRuns = runs.filter((r) => r.status === "running").length;
    const rcaToday = rcaSessions.filter((s) => new Date(s.createTime) >= todayStart).length;

    return {
        ruleCount: rules.length,
        enabledRuleCount: enabledCount,
        disabledRuleCount: rules.length - enabledCount,
        pendingAnomalyCount: pending.length,
        highRiskPendingCount: highRiskPending,
        healthScore,
        healthScoreDelta,
        autoFixRate,
        autoFixedCount: autoFixed,
        autoFixRateDelta,
        checkRunCount: runs.length,
        checkRunsToday: runsToday,
        runningCheckRuns: runningRuns,
        rcaSessionCount: rcaSessions.length,
        rcaSessionsToday: rcaToday,
    };
}

export function buildAnomalyTrendSeries(results: CheckResult[], days: number) {
    const today = startOfDay();
    const series: Array<{ date: string; newCount: number; resolvedCount: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const newCount = results.filter((r) => isSameCalendarDay(new Date(r.createTime), d)).length;
        const resolvedCount = results.filter(
            (r) => r.resolvedAt != null && isSameCalendarDay(new Date(r.resolvedAt), d),
        ).length;
        series.push({ date: toDateKey(d), newCount, resolvedCount });
    }
    return series;
}

export function buildRiskDistribution(results: CheckResult[]) {
    const pending = results.filter((r) => r.status === "待解决");
    return {
        high: pending.filter((r) => r.riskLevel === "高").length,
        medium: pending.filter((r) => r.riskLevel === "中").length,
        low: pending.filter((r) => r.riskLevel === "低").length,
    };
}

export function buildDomainDistribution(rules: CheckRule[], results: CheckResult[]) {
    const domainByRule = new Map(rules.map((r) => [r.ruleId, r.businessDomain]));
    const domains = [...new Set(rules.map((r) => r.businessDomain))].sort();
    return domains.map((domain) => {
        const rows = results.filter((r) => domainByRule.get(r.ruleId) === domain);
        return {
            domain,
            pending: rows.filter((r) => r.status === "待解决").length,
            resolved: rows.filter((r) => isResolvedStatus(r.status)).length,
        };
    });
}

export function buildTopRules(results: CheckResult[], limit: number) {
    const counts = new Map<string, number>();
    for (const r of results) {
        counts.set(r.ruleId, (counts.get(r.ruleId) ?? 0) + 1);
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([ruleId, count]) => ({ ruleId, count }));
}

export function buildStatusDistribution(results: CheckResult[]) {
    return {
        pending: results.filter((r) => r.status === "待解决").length,
        resolved: results.filter((r) => r.status === "已解决").length,
        aiAutoFixed: results.filter((r) => r.status === "ai自动修复").length,
    };
}

export function buildRepairTrend(results: CheckResult[], days: number) {
    const today = startOfDay();
    const series: Array<{ date: string; aiAutoFixed: number; manualResolved: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const onDay = results.filter(
            (r) => r.resolvedAt != null && isSameCalendarDay(new Date(r.resolvedAt), d),
        );
        series.push({
            date: toDateKey(d),
            aiAutoFixed: onDay.filter((r) => r.status === "ai自动修复").length,
            manualResolved: onDay.filter((r) => r.status === "已解决").length,
        });
    }
    return series;
}

export function buildRecentBatches(
    runs: CheckRun[],
    items: CheckRunItem[],
    limit: number,
) {
    const sorted = [...runs].sort((a, b) => b.id - a.id).slice(0, limit);
    return sorted.map((run) => {
        const runItems = items.filter((i) => i.runId === run.id);
        const done = runItems.filter((i) => i.status === "done").length;
        const failed = runItems.filter((i) => i.status === "failed").length;
        const pending = runItems.filter((i) => i.status === "pending").length;
        return {
            runId: run.id,
            status: run.status,
            ruleCount: runItems.length,
            done,
            failed,
            pending,
            startedAt: run.createTime,
            finishedAt: run.finishedAt,
        };
    });
}
