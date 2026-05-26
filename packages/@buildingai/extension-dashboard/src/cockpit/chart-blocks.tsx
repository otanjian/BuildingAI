import type { EnterpriseDashboardChartId, EnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";
import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    Pie,
    PieChart,
    XAxis,
    YAxis,
} from "recharts";

import type { DashboardOverview } from "../types";
import { fmtAxisDate, formatDashboardDateTime, tableTag } from "./utils";
import { ChartCard, EmptyChart, RiskBadge, RunStatusPill, TableCard } from "./ui-primitives";

const RISK_COLORS = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const STATUS_COLORS = { pending: "#ef4444", resolved: "#3b82f6", aiAutoFixed: "#10b981" };
const ESG_COLORS = ["#16a34a", "#2563eb", "#7c3aed", "#0d9488", "#ca8a04"];

function primaryStroke(hue: number): string {
    return `hsl(${hue} 78% 48%)`;
}

function accentPalette(hue: number): string[] {
    return [
        `hsl(${hue} 78% 48%)`,
        `hsl(${(hue + 28) % 360} 72% 50%)`,
        `hsl(${(hue + 56) % 360} 68% 52%)`,
        `hsl(${(hue + 84) % 360} 65% 46%)`,
        `hsl(${(hue + 112) % 360} 62% 44%)`,
    ];
}

type BlockProps = {
    data: DashboardOverview;
    config: EnterpriseDashboardConfig;
};

export function ChartBlock({
    chartId,
    data,
    config,
    title,
    badge,
}: BlockProps & {
    chartId: EnterpriseDashboardChartId;
    title?: string;
    badge?: string;
}) {
    const prefix = config.tablePrefix;
    const hue = config.hue;
    const tagResults = tableTag(prefix, "check_results");
    const tagRules = tableTag(prefix, "check_rules");
    const tagRuns = tableTag(prefix, "check_runs");

    const resolvedTitle = title ?? chartTitle(chartId, config);

    const body = renderChartBody(chartId, data, config, hue);
    if (!body) return null;

    return (
        <ChartCard
            title={resolvedTitle}
            tag={tagResults}
            tagTo="../anomalies"
            badge={badge}
            className={chartId === "riskDonut" ? "dash-panel--stamp" : undefined}
        >
            {body}
        </ChartCard>
    );
}

function chartTitle(chartId: EnterpriseDashboardChartId, config: EnterpriseDashboardConfig): string {
    const map: Partial<Record<EnterpriseDashboardChartId, string>> = {
        trendArea: config.trendChartTitle,
        domainBars: config.domainChartTitle,
        domainQuadrant: config.domainChartTitle,
        domainEsgBars: config.domainChartTitle,
        riskDonut: "风险等级分布",
        topRules: "规则异常 Top5",
        statusPie: "异常处理状态分布",
        batchStack: "最近批次执行状态",
        batchTimeline: "批次执行时间线",
        recentBatches: "最近检查批次概览",
        agingStack: "业务域账龄分布",
        repairTrend: "自动修复 vs 人工处理趋势",
    };
    return map[chartId] ?? "数据图表";
}

function renderChartBody(
    chartId: EnterpriseDashboardChartId,
    data: DashboardOverview,
    config: EnterpriseDashboardConfig,
    hue: number,
) {
    const primary = primaryStroke(hue);
    const palette = accentPalette(hue);

    switch (chartId) {
        case "trendArea":
            return <TrendAreaChart data={data} primary={primary} />;
        case "riskDonut":
            return <RiskDonutChart data={data} />;
        case "domainBars":
            return <DomainBarsChart data={data} primary={primary} esg={false} />;
        case "domainQuadrant":
            return <DomainBarsChart data={data} primary={primary} esg={false} compact />;
        case "domainEsgBars":
            return <DomainBarsChart data={data} primary={primary} esg />;
        case "topRules":
            return <TopRulesChart data={data} palette={palette} />;
        case "statusPie":
            return <StatusPieChart data={data} />;
        case "batchStack":
            return <BatchStackChart data={data} />;
        case "repairTrend":
            return <RepairTrendChart data={data} />;
        case "agingStack":
            return <DomainBarsChart data={data} primary={primary} esg={false} horizontal />;
        case "batchTimeline":
            return <BatchTimelineTable data={data} config={config} />;
        case "recentBatches":
            return <RecentBatchesMini data={data} config={config} />;
        default:
            return <EmptyChart />;
    }
}

function TrendAreaChart({ data, primary }: { data: DashboardOverview; primary: string }) {
    const trendChartConfig = {
        newCount: { label: "新增异常", color: "#ef4444" },
        resolvedCount: { label: "已解决", color: "#22c55e" },
    } satisfies ChartConfig;
    if (data.anomalyTrend.length === 0) return <EmptyChart />;
    return (
        <ChartContainer config={trendChartConfig} className="dash-chart dash-chart--tall">
            <ComposedChart data={data.anomalyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtAxisDate} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="newCount"
                    name="新增异常"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                />
                <Line
                    type="monotone"
                    dataKey="resolvedCount"
                    name="已解决"
                    stroke={primary}
                    strokeWidth={2}
                    dot={{ r: 3, fill: primary }}
                />
            </ComposedChart>
        </ChartContainer>
    );
}

function RiskDonutChart({ data }: { data: DashboardOverview }) {
    const { riskDistribution } = data;
    const riskPie = [
        { name: "高风险", value: riskDistribution.high, fill: RISK_COLORS.high },
        { name: "中风险", value: riskDistribution.medium, fill: RISK_COLORS.medium },
        { name: "低风险", value: riskDistribution.low, fill: RISK_COLORS.low },
    ].filter((d) => d.value > 0);
    if (riskPie.length === 0) return <EmptyChart />;
    return (
        <ChartContainer config={{}} className="dash-chart dash-chart--donut">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={riskPie} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {riskPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                    ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
        </ChartContainer>
    );
}

function DomainBarsChart({
    data,
    primary,
    esg,
    compact,
    horizontal,
}: {
    data: DashboardOverview;
    primary: string;
    esg: boolean;
    compact?: boolean;
    horizontal?: boolean;
}) {
    const { domainDistribution } = data;
    if (domainDistribution.length === 0) return <EmptyChart />;
    const domainChartConfig = {
        pending: { label: "待解决", color: "#ef4444" },
        resolved: { label: "已解决/已修复", color: "#22c55e" },
    } satisfies ChartConfig;

    if (horizontal) {
        return (
            <ChartContainer config={domainChartConfig} className="dash-chart">
                <BarChart
                    layout="vertical"
                    data={domainDistribution}
                    margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis
                        type="category"
                        dataKey="domain"
                        tickLine={false}
                        axisLine={false}
                        width={88}
                        fontSize={10}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="pending" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="resolved" fill={primary} radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
            </ChartContainer>
        );
    }

    return (
        <ChartContainer config={domainChartConfig} className={`dash-chart ${compact ? "" : ""}`}>
            <BarChart data={domainDistribution} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="domain" tickLine={false} axisLine={false} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                    dataKey="pending"
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    barSize={esg ? 18 : 14}
                >
                    {esg
                        ? domainDistribution.map((_, i) => (
                              <Cell key={i} fill="transparent" stroke={ESG_COLORS[i % ESG_COLORS.length]} />
                          ))
                        : null}
                </Bar>
                <Bar
                    dataKey="resolved"
                    fill="transparent"
                    stroke={primary}
                    strokeWidth={2}
                    radius={[4, 4, 0, 0]}
                    barSize={esg ? 18 : 14}
                />
            </BarChart>
        </ChartContainer>
    );
}

function TopRulesChart({
    data,
    palette,
}: {
    data: DashboardOverview;
    palette: string[];
}) {
    const { topRules } = data;
    if (topRules.length === 0) return <EmptyChart />;
    const topRulesChartConfig = Object.fromEntries(
        topRules.map((r, i) => [r.ruleId, { label: r.ruleId, color: palette[i % palette.length] }]),
    ) satisfies ChartConfig;
    return (
        <ChartContainer config={topRulesChartConfig} className="dash-chart">
            <BarChart layout="vertical" data={topRules} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="ruleId" tickLine={false} axisLine={false} width={72} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                    {topRules.map((entry, index) => (
                        <Cell key={entry.ruleId} fill={palette[index % palette.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
}

function StatusPieChart({ data }: { data: DashboardOverview }) {
    const { statusDistribution } = data;
    const statusPie = [
        { name: "待解决", value: statusDistribution.pending, fill: STATUS_COLORS.pending },
        { name: "已解决", value: statusDistribution.resolved, fill: STATUS_COLORS.resolved },
        {
            name: "AI 自动修复",
            value: statusDistribution.aiAutoFixed,
            fill: STATUS_COLORS.aiAutoFixed,
        },
    ].filter((d) => d.value > 0);
    if (statusPie.length === 0) return <EmptyChart />;
    return (
        <ChartContainer config={{}} className="dash-chart dash-chart--donut">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={78} paddingAngle={2}>
                    {statusPie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                    ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
        </ChartContainer>
    );
}

function BatchStackChart({ data }: { data: DashboardOverview }) {
    const { recentBatches } = data;
    if (recentBatches.length === 0) return <EmptyChart />;
    const batchChartConfig = {
        done: { label: "完成", color: "#22c55e" },
        failed: { label: "失败", color: "#ef4444" },
        pending: { label: "待处理", color: "#94a3b8" },
    } satisfies ChartConfig;
    return (
        <ChartContainer config={batchChartConfig} className="dash-chart">
            <BarChart
                data={recentBatches.map((b) => ({ ...b, label: `#${b.runId}` }))}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="done" stackId="a" fill="#22c55e" />
                <Bar dataKey="failed" stackId="a" fill="#ef4444" />
                <Bar dataKey="pending" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ChartContainer>
    );
}

function RepairTrendChart({ data }: { data: DashboardOverview }) {
    const repairChartConfig = {
        aiAutoFixed: { label: "AI 自动修复", color: "#10b981" },
        manualResolved: { label: "人工解决", color: "#3b82f6" },
    } satisfies ChartConfig;
    return (
        <ChartContainer config={repairChartConfig} className="dash-chart dash-chart--tall">
            <AreaChart data={data.repairTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtAxisDate} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                    type="monotone"
                    dataKey="aiAutoFixed"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.35}
                />
                <Area
                    type="monotone"
                    dataKey="manualResolved"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.35}
                />
            </AreaChart>
        </ChartContainer>
    );
}

function BatchTimelineTable({ data, config }: { data: DashboardOverview; config: EnterpriseDashboardConfig }) {
    const prefix = config.tablePrefix;
    return (
        <TableCard title="批次执行时间线" tag={tableTag(prefix, "check_runs")} tagTo="../anomalies">
            <table className="dash-table">
                <thead>
                    <tr>
                        <th>批次</th>
                        <th>状态</th>
                        <th>进度</th>
                        <th>开始</th>
                    </tr>
                </thead>
                <tbody>
                    {data.recentBatches.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="dash-empty-cell">
                                暂无批次
                            </td>
                        </tr>
                    ) : (
                        data.recentBatches.map((b) => (
                            <tr key={b.runId} className="dash-timeline-card">
                                <td>#{b.runId}</td>
                                <td>
                                    <RunStatusPill status={b.status} />
                                </td>
                                <td>
                                    {b.done}/{b.failed}/{b.pending}
                                </td>
                                <td>{formatDashboardDateTime(b.startedAt)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </TableCard>
    );
}

function RecentBatchesMini({ data, config }: { data: DashboardOverview; config: EnterpriseDashboardConfig }) {
    return (
        <ChartCard title="最近批次执行概览" tag={tableTag(config.tablePrefix, "check_runs")} tagTo="../anomalies">
            {data.recentBatches.length === 0 ? (
                <EmptyChart />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
                    {data.recentBatches.slice(0, 5).map((b) => (
                        <div
                            key={b.runId}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 12,
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: "var(--dash-primary-muted)",
                            }}
                        >
                            <span>批次 #{b.runId}</span>
                            <RunStatusPill status={b.status} />
                        </div>
                    ))}
                </div>
            )}
        </ChartCard>
    );
}

export function AnomaliesAndBatchesTables({ data, config }: BlockProps) {
    const prefix = config.tablePrefix;
    const { recentAnomalies, recentBatches } = data;
    return (
        <div className="dash-row dash-row--2">
            <TableCard
                title="最新异常记录"
                tag={tableTag(prefix, "check_results")}
                tagTo="../anomalies"
                linkLabel="待处理"
            >
                <table className="dash-table">
                    <thead>
                        <tr>
                            <th>异常ID</th>
                            <th>规则ID</th>
                            <th>描述</th>
                            <th>风险</th>
                            <th>状态</th>
                            <th>检查时间</th>
                            <th>解决时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentAnomalies.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="dash-empty-cell">
                                    暂无异常记录
                                </td>
                            </tr>
                        ) : (
                            recentAnomalies.map((a) => (
                                <tr key={a.anomalyId}>
                                    <td>{a.anomalyId}</td>
                                    <td>{a.ruleId}</td>
                                    <td className="dash-desc">{a.description}</td>
                                    <td>
                                        <RiskBadge risk={a.riskLevel} />
                                    </td>
                                    <td>{a.status}</td>
                                    <td>{formatDashboardDateTime(a.checkTime)}</td>
                                    <td>
                                        {a.resolvedAt ? formatDashboardDateTime(a.resolvedAt) : "—"}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </TableCard>

            <TableCard title={`最近${config.batchLabel}`} tag={tableTag(prefix, "check_runs")} tagTo="../anomalies">
                <table className="dash-table">
                    <thead>
                        <tr>
                            <th>批次ID</th>
                            <th>状态</th>
                            <th>规则数</th>
                            <th>成功/失败/待处理</th>
                            <th>开始时间</th>
                            <th>完成时间</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentBatches.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="dash-empty-cell">
                                    暂无批次
                                </td>
                            </tr>
                        ) : (
                            recentBatches.map((b) => (
                                <tr key={b.runId}>
                                    <td>#{b.runId}</td>
                                    <td>
                                        <RunStatusPill status={b.status} />
                                    </td>
                                    <td>{b.ruleCount}</td>
                                    <td>
                                        {b.done}/{b.failed}/{b.pending}
                                    </td>
                                    <td>{formatDashboardDateTime(b.startedAt)}</td>
                                    <td>{b.finishedAt ? formatDashboardDateTime(b.finishedAt) : "—"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </TableCard>
        </div>
    );
}

/** Secondary charts shared across templates (excluding hero/accent). */
export function SecondaryCharts({ data, config }: BlockProps) {
    const hero = config.heroChart;
    const accent = config.accentChart;
    const allSlots: EnterpriseDashboardChartId[] = [
        "trendArea",
        "riskDonut",
        "domainBars",
        "domainQuadrant",
        "domainEsgBars",
        "topRules",
        "statusPie",
        "batchStack",
        "repairTrend",
        "agingStack",
    ];
    const slots = allSlots.filter((id) => id !== hero && id !== accent);

    const row1 = slots.slice(0, 2);
    const row2 = slots.slice(2, 5);
    const row3 = slots.slice(5);

    return (
        <>
            {row1.length > 0 ? (
                <div className="dash-row dash-row--2">
                    {row1.map((id) => (
                        <ChartBlock key={id} chartId={id} data={data} config={config} badge={id === "riskDonut" ? "实时" : undefined} />
                    ))}
                </div>
            ) : null}
            {row2.length > 0 ? (
                <div className="dash-row dash-row--3">
                    {row2.map((id) => (
                        <ChartBlock key={id} chartId={id} data={data} config={config} />
                    ))}
                </div>
            ) : null}
            {row3.length > 0 ? (
                <div className="dash-row dash-row--2">
                    {row3.map((id) => (
                        <ChartBlock key={id} chartId={id} data={data} config={config} />
                    ))}
                </div>
            ) : null}
        </>
    );
}
