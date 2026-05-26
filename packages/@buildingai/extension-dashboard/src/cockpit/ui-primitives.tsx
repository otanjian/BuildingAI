import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { runStatusClass, runStatusLabel } from "./utils";

export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "dash-risk--high" : risk === "中" ? "dash-risk--mid" : "dash-risk--low";
    return <span className={`dash-risk ${cls}`}>{risk}</span>;
}

export function KpiCard({
    icon,
    title,
    value,
    sub,
    tag,
    tagTo,
    accentIndex = 0,
}: {
    icon: ReactNode;
    title: string;
    value: number | string;
    sub: string;
    tag?: string;
    tagTo?: string;
    accentIndex?: number;
}) {
    const accent = Math.min(Math.max(accentIndex, 0), 5);
    return (
        <div className={`dash-kpi dash-kpi--accent-${accent}`}>
            <div className="dash-kpi-icon">{icon}</div>
            <div className="dash-kpi-body">
                <div className="dash-kpi-title">{title}</div>
                <div className="dash-kpi-value">{value}</div>
                <div className="dash-kpi-sub">{sub}</div>
            </div>
            {tag && tagTo ? (
                <Link to={tagTo} className="dash-tag">
                    {tag}
                </Link>
            ) : null}
        </div>
    );
}

export function ChartCard({
    title,
    tag,
    tagTo,
    badge,
    className,
    children,
}: {
    title: string;
    tag?: string;
    tagTo?: string;
    badge?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={`dash-panel ${className ?? ""}`.trim()}>
            <div className="dash-card-hd">
                <span className="dash-card-title">{title}</span>
                <span className="dash-card-meta">
                    {badge ? <span className="dash-badge-live">{badge}</span> : null}
                    {tag && tagTo ? (
                        <Link to={tagTo} className="dash-tag">
                            {tag}
                        </Link>
                    ) : null}
                </span>
            </div>
            <div className="dash-card-body">{children}</div>
        </div>
    );
}

export function TableCard({
    title,
    tag,
    tagTo,
    linkLabel,
    children,
}: {
    title: string;
    tag?: string;
    tagTo?: string;
    linkLabel?: string;
    children: ReactNode;
}) {
    return (
        <div className="dash-panel dash-panel--table">
            <div className="dash-card-hd">
                <span className="dash-card-title">{title}</span>
                <span className="dash-card-meta">
                    {linkLabel && tagTo ? (
                        <Link to={tagTo} className="dash-link">
                            {linkLabel}
                        </Link>
                    ) : null}
                    {tag && tagTo ? (
                        <Link to={tagTo} className="dash-tag">
                            {tag}
                        </Link>
                    ) : null}
                </span>
            </div>
            <div className="dash-table-wrap">{children}</div>
        </div>
    );
}

export function EmptyChart() {
    return <div className="dash-empty-chart">暂无数据</div>;
}

export function RunStatusPill({ status }: { status: string }) {
    return (
        <span className={`dash-status ${runStatusClass(status)}`}>{runStatusLabel(status)}</span>
    );
}
