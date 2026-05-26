import {
    type ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@buildingai/ui/components/ui/chart";
import type { ReactNode } from "react";
import {
    AlertTriangle,
    Bot,
    ClipboardList,
    Diamond,
    FileText,
    MessageSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
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

import { RiskBadge } from "../../components/risk-badge";
import { formatEhcsDateTime } from "../../lib/format-datetime";
import type { DashboardOverview } from "../../services/dashboard";

const RISK_COLORS = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const TOP_RULE_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#8b5cf6", "#22c55e"];
const STATUS_COLORS = { pending: "#ef4444", resolved: "#3b82f6", aiAutoFixed: "#10b981" };

function fmtAxisDate(iso: string): string {
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return `${Number(parts[1])}/${Number(parts[2])}`;
}

function formatDelta(n: number, suffix = ""): string {
    if (n > 0) return `↑ ${Math.abs(n)}${suffix} 较昨日`;
    if (n < 0) return `↓ ${Math.abs(n)}${suffix} 较昨日`;
    return `— 较昨日`;
}

function runStatusLabel(status: string): string {
    if (status === "completed") return "已完成";
    if (status === "running") return "运行中";
    if (status === "cancelled") return "已取消";
    return status;
}

function runStatusClass(status: string): string {
    if (status === "completed") return "ehcs-dash-status--ok";
    if (status === "running") return "ehcs-dash-status--run";
    return "ehcs-dash-status--muted";
}

type Props = {
    data: DashboardOverview;
};

export function DashboardCockpit({ data }: Props) {
    const { summary, anomalyTrend, riskDistribution, domainDistribution, topRules } = data;
    const { statusDistribution, repairTrend, recentBatches, recentAnomalies } = data;

    const riskPie = [
        { name: "高风险", value: riskDistribution.high, fill: RISK_COLORS.high },
        { name: "中风险", value: riskDistribution.medium, fill: RISK_COLORS.medium },
        { name: "低风险", value: riskDistribution.low, fill: RISK_COLORS.low },
    ].filter((d) => d.value > 0);

    const statusPie = [
        { name: "待解决", value: statusDistribution.pending, fill: STATUS_COLORS.pending },
        { name: "已解决", value: statusDistribution.resolved, fill: STATUS_COLORS.resolved },
        {
            name: "AI 自动修复",
            value: statusDistribution.aiAutoFixed,
            fill: STATUS_COLORS.aiAutoFixed,
        },
    ].filter((d) => d.value > 0);

    const trendChartConfig = {
        newCount: { label: "新增异常", color: "#ef4444" },
        resolvedCount: { label: "已解决", color: "#22c55e" },
    } satisfies ChartConfig;

    const domainChartConfig = {
        pending: { label: "待解决", color: "#ef4444" },
        resolved: { label: "已解决/已修复", color: "#22c55e" },
    } satisfies ChartConfig;

    const batchChartConfig = {
        done: { label: "完成", color: "#22c55e" },
        failed: { label: "失败", color: "#ef4444" },
        pending: { label: "待处理", color: "#94a3b8" },
    } satisfies ChartConfig;

    const repairChartConfig = {
        aiAutoFixed: { label: "AI 自动修复", color: "#10b981" },
        manualResolved: { label: "人工解决", color: "#3b82f6" },
    } satisfies ChartConfig;

    const topRulesChartConfig = Object.fromEntries(
        topRules.map((r, i) => [r.ruleId, { label: r.ruleId, color: TOP_RULE_COLORS[i % 5] }]),
    ) satisfies ChartConfig;

    return (
        <div className="ehcs-dash">
            <div className="ehcs-dash-kpis">
                <KpiCard
                    icon={<FileText size={18} />}
                    title="规则总数"
                    value={summary.ruleCount}
                    sub={`已启用 ${summary.enabledRuleCount} 条，禁用 ${summary.disabledRuleCount} 条`}
                    tag="ehcs-check_rules"
                    tagTo="../rules"
                />
                <KpiCard
                    icon={<AlertTriangle size={18} />}
                    title="待解决异常"
                    value={summary.pendingAnomalyCount}
                    sub={`其中高风险 ${summary.highRiskPendingCount} 条`}
                    tag="ehcs-check_results"
                    tagTo="../anomalies"
                />
                <KpiCard
                    icon={<Diamond size={18} />}
                    title="数据健康分"
                    value={summary.healthScore}
                    sub={formatDelta(summary.healthScoreDelta)}
                />
                <KpiCard
                    icon={<Bot size={18} />}
                    title="自动修复率"
                    value={`${summary.autoFixRate}%`}
                    sub={`已修复 ${summary.autoFixedCount} 条，${formatDelta(summary.autoFixRateDelta, "%")}`}
                />
                <KpiCard
                    icon={<ClipboardList size={18} />}
                    title="检查批次"
                    value={summary.checkRunCount}
                    sub={`今日 ${summary.checkRunsToday} 批，${summary.runningCheckRuns} 批运行中`}
                    tag="ehcs-check_runs"
                    tagTo="../anomalies"
                />
                <KpiCard
                    icon={<MessageSquare size={18} />}
                    title="RCA 会话"
                    value={summary.rcaSessionCount}
                    sub={`今日新建 ${summary.rcaSessionsToday} 次`}
                />
            </div>

            <div className="ehcs-dash-row ehcs-dash-row--2">
                <ChartCard title="近14天异常趋势" tag="ehcs-check_results" tagTo="../anomalies">
                    <ChartContainer config={trendChartConfig} className="ehcs-dash-chart ehcs-dash-chart--tall">
                        <ComposedChart data={anomalyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={fmtAxisDate}
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                            />
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
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={{ r: 3, fill: "#22c55e" }}
                            />
                        </ComposedChart>
                    </ChartContainer>
                </ChartCard>

                <ChartCard title="风险等级分布" tag="ehcs-check_results" tagTo="../anomalies" badge="实时">
                    {riskPie.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ChartContainer config={{}} className="ehcs-dash-chart ehcs-dash-chart--donut">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie
                                    data={riskPie}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={52}
                                    outerRadius={78}
                                    paddingAngle={2}
                                >
                                    {riskPie.map((entry) => (
                                        <Cell key={entry.name} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartLegend content={<ChartLegendContent />} />
                            </PieChart>
                        </ChartContainer>
                    )}
                </ChartCard>
            </div>

            <div className="ehcs-dash-row ehcs-dash-row--3">
                <ChartCard title="业务域异常分布" tag="ehcs-check_results" tagTo="../anomalies">
                    {domainDistribution.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ChartContainer config={domainChartConfig} className="ehcs-dash-chart">
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
                                    barSize={14}
                                />
                                <Bar
                                    dataKey="resolved"
                                    fill="transparent"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    radius={[4, 4, 0, 0]}
                                    barSize={14}
                                />
                            </BarChart>
                        </ChartContainer>
                    )}
                </ChartCard>

                <ChartCard title="规则异常 Top5" tag="ehcs-check_rules" tagTo="../rules">
                    {topRules.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ChartContainer config={topRulesChartConfig} className="ehcs-dash-chart">
                            <BarChart
                                layout="vertical"
                                data={topRules}
                                margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                                <YAxis
                                    type="category"
                                    dataKey="ruleId"
                                    tickLine={false}
                                    axisLine={false}
                                    width={72}
                                    fontSize={11}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                                    {topRules.map((entry, index) => (
                                        <Cell
                                            key={entry.ruleId}
                                            fill={TOP_RULE_COLORS[index % TOP_RULE_COLORS.length]}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    )}
                </ChartCard>

                <ChartCard title="异常处理状态分布" tag="ehcs-check_results" tagTo="../anomalies">
                    {statusPie.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ChartContainer config={{}} className="ehcs-dash-chart ehcs-dash-chart--donut">
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
                    )}
                </ChartCard>
            </div>

            <div className="ehcs-dash-row ehcs-dash-row--2">
                <ChartCard title="最近批次执行状态" tag="ehcs-check_runs" tagTo="../anomalies">
                    {recentBatches.length === 0 ? (
                        <EmptyChart />
                    ) : (
                        <ChartContainer config={batchChartConfig} className="ehcs-dash-chart">
                            <BarChart
                                data={recentBatches.map((b) => ({
                                    ...b,
                                    label: `#${b.runId}`,
                                }))}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="done" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="failed" stackId="a" fill="#ef4444" />
                                <Bar dataKey="pending" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ChartContainer>
                    )}
                </ChartCard>

                <ChartCard title="自动修复 vs 人工处理趋势" tag="ehcs-check_results" tagTo="../anomalies">
                    <ChartContainer config={repairChartConfig} className="ehcs-dash-chart ehcs-dash-chart--tall">
                        <AreaChart data={repairTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={fmtAxisDate}
                                tickLine={false}
                                axisLine={false}
                                fontSize={11}
                            />
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
                </ChartCard>
            </div>

            <div className="ehcs-dash-row ehcs-dash-row--2">
                <TableCard title="最新异常记录" tag="ehcs-check_results" tagTo="../anomalies" linkLabel="待处理">
                    <table className="ehcs-table ehcs-dash-table">
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
                                    <td colSpan={7} className="ehcs-dash-empty-cell">
                                        暂无异常记录
                                    </td>
                                </tr>
                            ) : (
                                recentAnomalies.map((a) => (
                                    <tr key={a.anomalyId}>
                                        <td>{a.anomalyId}</td>
                                        <td>{a.ruleId}</td>
                                        <td className="ehcs-dash-desc">{a.description}</td>
                                        <td>
                                            <RiskBadge risk={a.riskLevel} />
                                        </td>
                                        <td>{a.status}</td>
                                        <td>{formatEhcsDateTime(a.checkTime)}</td>
                                        <td>
                                            {a.resolvedAt
                                                ? formatEhcsDateTime(a.resolvedAt)
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </TableCard>

                <TableCard title="最近检查批次" tag="ehcs-check_runs" tagTo="../anomalies">
                    <table className="ehcs-table ehcs-dash-table">
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
                                    <td colSpan={6} className="ehcs-dash-empty-cell">
                                        暂无检查批次
                                    </td>
                                </tr>
                            ) : (
                                recentBatches.map((b) => (
                                    <tr key={b.runId}>
                                        <td>#{b.runId}</td>
                                        <td>
                                            <span
                                                className={`ehcs-dash-status ${runStatusClass(b.status)}`}
                                            >
                                                {runStatusLabel(b.status)}
                                            </span>
                                        </td>
                                        <td>{b.ruleCount}</td>
                                        <td>
                                            {b.done}/{b.failed}/{b.pending}
                                        </td>
                                        <td>{formatEhcsDateTime(b.startedAt)}</td>
                                        <td>
                                            {b.finishedAt
                                                ? formatEhcsDateTime(b.finishedAt)
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </TableCard>
            </div>
        </div>
    );
}

function KpiCard({
    icon,
    title,
    value,
    sub,
    tag,
    tagTo,
}: {
    icon: ReactNode;
    title: string;
    value: number | string;
    sub: string;
    tag?: string;
    tagTo?: string;
}) {
    return (
        <div className="ehcs-card ehcs-dash-kpi">
            <div className="ehcs-dash-kpi-icon">{icon}</div>
            <div className="ehcs-dash-kpi-body">
                <div className="ehcs-dash-kpi-title">{title}</div>
                <div className="ehcs-dash-kpi-value">{value}</div>
                <div className="ehcs-dash-kpi-sub">{sub}</div>
            </div>
            {tag && tagTo ? (
                <Link to={tagTo} className="ehcs-dash-tag">
                    {tag}
                </Link>
            ) : null}
        </div>
    );
}

function ChartCard({
    title,
    tag,
    tagTo,
    badge,
    children,
}: {
    title: string;
    tag?: string;
    tagTo?: string;
    badge?: string;
    children: ReactNode;
}) {
    return (
        <div className="ehcs-card ehcs-dash-panel">
            <div className="ehcs-dash-card-hd">
                <span className="ehcs-dash-card-title">{title}</span>
                <span className="ehcs-dash-card-meta">
                    {badge ? <span className="ehcs-dash-badge">{badge}</span> : null}
                    {tag && tagTo ? (
                        <Link to={tagTo} className="ehcs-dash-tag">
                            {tag}
                        </Link>
                    ) : null}
                </span>
            </div>
            <div className="ehcs-dash-card-body">{children}</div>
        </div>
    );
}

function TableCard({
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
        <div className="ehcs-card ehcs-dash-panel ehcs-dash-panel--table">
            <div className="ehcs-dash-card-hd">
                <span className="ehcs-dash-card-title">{title}</span>
                <span className="ehcs-dash-card-meta">
                    {linkLabel && tagTo ? (
                        <Link to={tagTo} className="ehcs-dash-link">
                            {linkLabel}
                        </Link>
                    ) : null}
                    {tag && tagTo ? (
                        <Link to={tagTo} className="ehcs-dash-tag">
                            {tag}
                        </Link>
                    ) : null}
                </span>
            </div>
            <div className="ehcs-dash-table-wrap">{children}</div>
        </div>
    );
}

function EmptyChart() {
    return <div className="ehcs-dash-empty-chart">暂无数据</div>;
}
