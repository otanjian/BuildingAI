import type { LucideIcon } from "lucide-react";
import {
    AlertTriangle,
    BarChart3,
    Bot,
    ClipboardList,
    Diamond,
    FileText,
    Flame,
    Layers,
    MessageSquare,
    Percent,
    PlayCircle,
    ShieldAlert,
    Target,
    TrendingUp,
} from "lucide-react";

import type { KpiMetricId } from "./resolve-kpi-metric";

const METRIC_ICONS: Partial<Record<KpiMetricId, LucideIcon>> = {
    ruleCount: FileText,
    enabledRules: FileText,
    disabledRules: FileText,
    enabledRuleShare: Percent,
    pendingAnomalies: AlertTriangle,
    highRiskPending: ShieldAlert,
    healthScore: Diamond,
    autoFixRate: Bot,
    autoFixedCount: Bot,
    checkRunTotal: ClipboardList,
    checkRunsToday: PlayCircle,
    runningCheckRuns: PlayCircle,
    rcaSessions: MessageSquare,
    rcaToday: MessageSquare,
    riskHigh: Flame,
    riskMedium: AlertTriangle,
    riskLow: Target,
    domainLeadPending: Layers,
    topRuleHits: BarChart3,
    topRuleId: BarChart3,
    resolvedShare: Percent,
    aiFixShare: Bot,
    pendingShare: Percent,
    statusPending: AlertTriangle,
    newAnomalies14d: TrendingUp,
    resolved14d: TrendingUp,
    batchStackDone: ClipboardList,
    batchStackFailed: ShieldAlert,
};

export function iconForMetric(metric: string): LucideIcon {
    return METRIC_ICONS[metric as KpiMetricId] ?? BarChart3;
}
