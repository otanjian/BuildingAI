import type { EnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";

import type { DashboardOverview } from "../types";
import { formatDelta, tableTag } from "./utils";

export type ResolvedKpi = {
    value: number | string;
    sub: string;
    tag?: string;
    tagTo?: string;
};

export type KpiMetricId =
    | "ruleCount"
    | "enabledRules"
    | "disabledRules"
    | "enabledRuleShare"
    | "pendingAnomalies"
    | "highRiskPending"
    | "healthScore"
    | "autoFixRate"
    | "autoFixedCount"
    | "checkRunTotal"
    | "checkRunsToday"
    | "runningCheckRuns"
    | "rcaSessions"
    | "rcaToday"
    | "riskHigh"
    | "riskMedium"
    | "riskLow"
    | "domainLeadPending"
    | "topRuleHits"
    | "topRuleId"
    | "resolvedShare"
    | "aiFixShare"
    | "pendingShare"
    | "statusPending"
    | "newAnomalies14d"
    | "resolved14d"
    | "batchStackDone"
    | "batchStackFailed";

function sumTrendNew(trend: DashboardOverview["anomalyTrend"]): number {
    return trend.reduce((a, p) => a + p.newCount, 0);
}

function sumTrendResolved(trend: DashboardOverview["anomalyTrend"]): number {
    return trend.reduce((a, p) => a + p.resolvedCount, 0);
}

function domainWithMaxPending(data: DashboardOverview): { domain: string; pending: number } {
    if (data.domainDistribution.length === 0) {
        return { domain: "—", pending: 0 };
    }
    const lead = data.domainDistribution.reduce((a, b) => (b.pending > a.pending ? b : a));
    return { domain: lead.domain, pending: lead.pending };
}

function statusTotal(data: DashboardOverview): number {
    const s = data.statusDistribution;
    return s.pending + s.resolved + s.aiAutoFixed;
}

export function resolveKpiMetric(
    metric: string,
    data: DashboardOverview,
    config: EnterpriseDashboardConfig,
): ResolvedKpi {
    const { summary } = data;
    const prefix = config.tablePrefix;
    const rulesTag = tableTag(prefix, "check_rules");
    const resultsTag = tableTag(prefix, "check_results");
    const runsTag = tableTag(prefix, "check_runs");

    switch (metric as KpiMetricId) {
        case "ruleCount":
            return {
                value: summary.ruleCount,
                sub: `已启用 ${summary.enabledRuleCount} / 禁用 ${summary.disabledRuleCount}`,
                tag: rulesTag,
                tagTo: "../rules",
            };
        case "enabledRules":
            return {
                value: summary.enabledRuleCount,
                sub: `共 ${summary.ruleCount} 条规则，禁用 ${summary.disabledRuleCount} 条`,
                tag: rulesTag,
                tagTo: "../rules",
            };
        case "disabledRules":
            return {
                value: summary.disabledRuleCount,
                sub: `已启用 ${summary.enabledRuleCount} 条可参与检查`,
                tag: rulesTag,
                tagTo: "../rules",
            };
        case "enabledRuleShare": {
            const pct = summary.ruleCount > 0 ? Math.round((summary.enabledRuleCount / summary.ruleCount) * 100) : 0;
            return {
                value: `${pct}%`,
                sub: `${summary.enabledRuleCount} / ${summary.ruleCount} 条已启用`,
                tag: rulesTag,
                tagTo: "../rules",
            };
        }
        case "pendingAnomalies":
            return {
                value: summary.pendingAnomalyCount,
                sub: `高风险 ${summary.highRiskPendingCount} 条 · ${formatDelta(summary.healthScoreDelta)}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "highRiskPending":
            return {
                value: summary.highRiskPendingCount,
                sub: `待处理合计 ${summary.pendingAnomalyCount} 条`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "healthScore":
            return {
                value: summary.healthScore,
                sub: formatDelta(summary.healthScoreDelta),
            };
        case "autoFixRate":
            return {
                value: `${summary.autoFixRate}%`,
                sub: `已修复 ${summary.autoFixedCount} 条 · ${formatDelta(summary.autoFixRateDelta, "%")}`,
            };
        case "autoFixedCount":
            return {
                value: summary.autoFixedCount,
                sub: `自动修复率 ${summary.autoFixRate}%`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "checkRunTotal":
            return {
                value: summary.checkRunCount,
                sub: `今日 ${summary.checkRunsToday} 批 · 运行中 ${summary.runningCheckRuns}`,
                tag: runsTag,
                tagTo: "../anomalies",
            };
        case "checkRunsToday":
            return {
                value: summary.checkRunsToday,
                sub: `累计 ${summary.checkRunCount} 批 · ${summary.runningCheckRuns} 批运行中`,
                tag: runsTag,
                tagTo: "../anomalies",
            };
        case "runningCheckRuns":
            return {
                value: summary.runningCheckRuns,
                sub: `今日已启动 ${summary.checkRunsToday} 批`,
                tag: runsTag,
                tagTo: "../anomalies",
            };
        case "rcaSessions":
            return {
                value: summary.rcaSessionCount,
                sub: `今日新建 ${summary.rcaSessionsToday} 次`,
            };
        case "rcaToday":
            return {
                value: summary.rcaSessionsToday,
                sub: `累计会话 ${summary.rcaSessionCount} 次`,
            };
        case "riskHigh":
            return {
                value: data.riskDistribution.high,
                sub: `中 ${data.riskDistribution.medium} · 低 ${data.riskDistribution.low}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "riskMedium":
            return {
                value: data.riskDistribution.medium,
                sub: `高 ${data.riskDistribution.high} · 低 ${data.riskDistribution.low}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "riskLow":
            return {
                value: data.riskDistribution.low,
                sub: `高 ${data.riskDistribution.high} · 中 ${data.riskDistribution.medium}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "domainLeadPending": {
            const lead = domainWithMaxPending(data);
            return {
                value: lead.pending,
                sub: `业务域：${lead.domain}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        }
        case "topRuleHits": {
            const top = data.topRules[0];
            return {
                value: top?.count ?? 0,
                sub: top ? `规则 ${top.ruleId}` : "暂无命中规则",
                tag: rulesTag,
                tagTo: "../rules",
            };
        }
        case "topRuleId": {
            const top = data.topRules[0];
            return {
                value: top?.ruleId ?? "—",
                sub: top ? `命中 ${top.count} 次` : "暂无数据",
                tag: rulesTag,
                tagTo: "../rules",
            };
        }
        case "resolvedShare": {
            const total = statusTotal(data);
            const pct = total > 0 ? Math.round((data.statusDistribution.resolved / total) * 100) : 0;
            return {
                value: `${pct}%`,
                sub: `AI 修复 ${data.statusDistribution.aiAutoFixed} · 待解决 ${data.statusDistribution.pending}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        }
        case "aiFixShare": {
            const total = statusTotal(data);
            const pct = total > 0 ? Math.round((data.statusDistribution.aiAutoFixed / total) * 100) : 0;
            return {
                value: `${pct}%`,
                sub: `人工解决 ${data.statusDistribution.resolved} 条`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        }
        case "pendingShare": {
            const pct =
                summary.ruleCount > 0
                    ? Math.round((summary.pendingAnomalyCount / summary.ruleCount) * 100)
                    : 0;
            return {
                value: `${pct}%`,
                sub: `待处理 ${summary.pendingAnomalyCount} 条异常`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        }
        case "statusPending":
            return {
                value: data.statusDistribution.pending,
                sub: `已解决 ${data.statusDistribution.resolved} · AI ${data.statusDistribution.aiAutoFixed}`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "newAnomalies14d":
            return {
                value: sumTrendNew(data.anomalyTrend),
                sub: `近14天已解决 ${sumTrendResolved(data.anomalyTrend)} 条`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "resolved14d":
            return {
                value: sumTrendResolved(data.anomalyTrend),
                sub: `近14天新增 ${sumTrendNew(data.anomalyTrend)} 条`,
                tag: resultsTag,
                tagTo: "../anomalies",
            };
        case "batchStackDone": {
            const done = data.recentBatches.reduce((a, b) => a + b.done, 0);
            return {
                value: done,
                sub: `最近 ${data.recentBatches.length} 个批次合计`,
                tag: runsTag,
                tagTo: "../anomalies",
            };
        }
        case "batchStackFailed": {
            const failed = data.recentBatches.reduce((a, b) => a + b.failed, 0);
            return {
                value: failed,
                sub: `完成 ${data.recentBatches.reduce((a, b) => a + b.done, 0)} · 待处理 ${data.recentBatches.reduce((a, b) => a + b.pending, 0)}`,
                tag: runsTag,
                tagTo: "../anomalies",
            };
        }
        default:
            return {
                value: "—",
                sub: "未知指标",
            };
    }
}
