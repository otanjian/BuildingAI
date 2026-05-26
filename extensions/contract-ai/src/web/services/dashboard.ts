import { consoleHttpClient } from "./base";
import type { CheckResultDto } from "./anomalies";

export type DashboardSummary = {
    ruleCount: number;
    enabledRuleCount: number;
    disabledRuleCount: number;
    pendingAnomalyCount: number;
    highRiskPendingCount: number;
    healthScore: number;
    healthScoreDelta: number;
    autoFixRate: number;
    autoFixedCount: number;
    autoFixRateDelta: number;
    checkRunCount: number;
    checkRunsToday: number;
    runningCheckRuns: number;
    rcaSessionCount: number;
    rcaSessionsToday: number;
};

export type AnomalyTrendPoint = {
    date: string;
    newCount: number;
    resolvedCount: number;
};

export type RiskDistribution = {
    high: number;
    medium: number;
    low: number;
};

export type DomainDistributionPoint = {
    domain: string;
    pending: number;
    resolved: number;
};

export type TopRulePoint = {
    ruleId: string;
    count: number;
};

export type StatusDistribution = {
    pending: number;
    resolved: number;
    aiAutoFixed: number;
};

export type RepairTrendPoint = {
    date: string;
    aiAutoFixed: number;
    manualResolved: number;
};

export type RecentBatchRow = {
    runId: number;
    status: string;
    ruleCount: number;
    done: number;
    failed: number;
    pending: number;
    startedAt: string;
    finishedAt: string | null;
};

export type DashboardOverview = {
    summary: DashboardSummary;
    anomalyTrend: AnomalyTrendPoint[];
    riskDistribution: RiskDistribution;
    domainDistribution: DomainDistributionPoint[];
    topRules: TopRulePoint[];
    statusDistribution: StatusDistribution;
    repairTrend: RepairTrendPoint[];
    recentBatches: RecentBatchRow[];
    recentAnomalies: CheckResultDto[];
};

/** @deprecated Use getDashboardOverview */
export type TrendPoint = { date: string; count: number };

export function getDashboardOverview() {
    return consoleHttpClient.get<DashboardOverview>("/dashboard/overview");
}

export function getDashboardSummary() {
    return consoleHttpClient.get<DashboardSummary>("/dashboard/summary");
}

export function getDashboardTrend(days = 7) {
    return consoleHttpClient.get<TrendPoint[]>("/dashboard/trend", { params: { days } });
}

export function getRecentAnomalies(limit = 5) {
    return consoleHttpClient.get<CheckResultDto[]>("/dashboard/recent-anomalies", {
        params: { limit },
    });
}
