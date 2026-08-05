/** Enterprise dashboard template catalog for the shared extension-dashboard cockpit. */

export const ENTERPRISE_DASHBOARD_TEMPLATE_IDS = [
    "supply-chain",
    "compliance-audit",
    "finance",
    "operations",
    "project-service",
    "sustainability",
] as const;

export type EnterpriseDashboardTemplateId = (typeof ENTERPRISE_DASHBOARD_TEMPLATE_IDS)[number];

export type EnterpriseDashboardKpiSlot = {
    metric: string;
    label: string;
};

export type EnterpriseDashboardChartId =
    | "trendArea"
    | "riskDonut"
    | "domainBars"
    | "domainQuadrant"
    | "domainEsgBars"
    | "topRules"
    | "statusPie"
    | "batchStack"
    | "batchTimeline"
    | "recentBatches"
    | "agingStack"
    | "repairTrend";

export type EnterpriseDashboardConfig = {
    appId: string;
    template: EnterpriseDashboardTemplateId;
    hue: number;
    icon: string;
    healthScoreLabel: string;
    batchLabel: string;
    heroChart: EnterpriseDashboardChartId;
    accentChart: EnterpriseDashboardChartId;
    domainChartTitle: string;
    trendChartTitle: string;
    kpis: EnterpriseDashboardKpiSlot[];
    tablePrefix: string;
};
/** No enterprise apps beyond EHCS remain; EHCS renders its own dashboard page. */
export const ENTERPRISE_DASHBOARD_BY_APP_ID: Record<string, EnterpriseDashboardConfig> = {};

export function getEnterpriseDashboardConfig(appId: string): EnterpriseDashboardConfig | undefined {
    return ENTERPRISE_DASHBOARD_BY_APP_ID[appId];
}

