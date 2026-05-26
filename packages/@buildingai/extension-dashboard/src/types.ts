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

export type DashboardAnomalyRow = {
    anomalyId: string;
    ruleId: string;
    description: string;
    riskLevel: string;
    status: string;
    checkTime: string;
    resolvedAt: string | null;
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
    recentAnomalies: DashboardAnomalyRow[];
};

export type { EnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";
