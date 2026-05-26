import type { CSSProperties } from "react";

import type { EnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";

import type { DashboardOverview } from "../types";
import { iconForMetric } from "./kpi-icons";
import { resolveKpiMetric } from "./resolve-kpi-metric";
import { formatDelta } from "./utils";
import { KpiCard } from "./ui-primitives";

export function KpiRow({
    data,
    config,
}: {
    data: DashboardOverview;
    config: EnterpriseDashboardConfig;
}) {
    const slots = config.kpis ?? [];

    return (
        <div className="dash-kpis">
            {slots.map((slot, index) => {
                const resolved = resolveKpiMetric(slot.metric, data, config);
                const Icon = iconForMetric(slot.metric);
                return (
                    <KpiCard
                        key={`${slot.metric}-${slot.label}`}
                        accentIndex={index}
                        icon={<Icon size={20} strokeWidth={2.25} />}
                        title={slot.label}
                        value={resolved.value}
                        sub={resolved.sub}
                        tag={resolved.tag}
                        tagTo={resolved.tagTo}
                    />
                );
            })}
        </div>
    );
}

export function HeroHealthScore({
    data,
    config,
}: {
    data: DashboardOverview;
    config: EnterpriseDashboardConfig;
}) {
    const { summary } = data;
    const { high, medium, low } = data.riskDistribution;
    const lead = data.domainDistribution.length
        ? data.domainDistribution.reduce((a, b) => (b.pending > a.pending ? b : a))
        : null;
    const heroSub = lead
        ? `${formatDelta(summary.healthScoreDelta)} · 最重域 ${lead.domain} (${lead.pending} 条待处理)`
        : formatDelta(summary.healthScoreDelta);
    const score = summary.healthScore;
    const ringDeg = Math.min(100, Math.max(0, score)) * 3.6;

    return (
        <div className="dash-hero-score">
            <div
                className="dash-hero-gauge"
                style={{ "--dash-gauge-deg": `${ringDeg}deg` } as CSSProperties}
                aria-hidden
            >
                <div className="dash-hero-gauge-inner">
                    <span className="dash-hero-gauge-value">{score}</span>
                    <span className="dash-hero-gauge-unit">/ 100</span>
                </div>
            </div>
            <div className="dash-hero-score-body">
                <div className="dash-hero-score-label">{config.healthScoreLabel}</div>
                <div className="dash-hero-score-status">
                    {score >= 80 ? "健康" : score >= 60 ? "关注" : "风险"} · {heroSub}
                </div>
                <div className="dash-hero-risks">
                    <span className="dash-hero-risk dash-hero-risk--high">高 {high}</span>
                    <span className="dash-hero-risk dash-hero-risk--mid">中 {medium}</span>
                    <span className="dash-hero-risk dash-hero-risk--low">低 {low}</span>
                </div>
            </div>
        </div>
    );
}
