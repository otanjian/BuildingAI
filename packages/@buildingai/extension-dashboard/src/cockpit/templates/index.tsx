import type { EnterpriseDashboardConfig } from "@buildingai/constants/shared/enterprise-dashboard.constant";

import type { DashboardOverview } from "../../types";
import { AnomaliesAndBatchesTables, ChartBlock, SecondaryCharts } from "../chart-blocks";
import { HeroHealthScore, KpiRow } from "../kpi-row";

type TemplateProps = {
    data: DashboardOverview;
    config: EnterpriseDashboardConfig;
};

function HeroAccentRow({ data, config }: TemplateProps) {
    return (
        <div className="dash-row dash-row--2">
            <ChartBlock chartId={config.heroChart} data={data} config={config} badge="核心指标" />
            <ChartBlock chartId={config.accentChart} data={data} config={config} />
        </div>
    );
}

export function SupplyChainTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <div className="dash-hero-row">
                <HeroHealthScore data={data} config={config} />
                <ChartBlock chartId={config.heroChart} data={data} config={config} />
            </div>
            <KpiRow data={data} config={config} />
            <div className="dash-row dash-row--2">
                <ChartBlock chartId={config.accentChart} data={data} config={config} />
                <ChartBlock chartId="riskDonut" data={data} config={config} badge="实时" />
            </div>
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function ComplianceAuditTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <KpiRow data={data} config={config} />
            <div className="dash-row dash-row--2">
                <ChartBlock chartId={config.heroChart} data={data} config={config} badge="实时" />
                <ChartBlock chartId={config.accentChart} data={data} config={config} />
            </div>
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function FinanceTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <KpiRow data={data} config={config} />
            <div className="dash-row dash-row--2">
                <ChartBlock chartId={config.heroChart} data={data} config={config} />
                <ChartBlock chartId={config.accentChart} data={data} config={config} badge="实时" />
            </div>
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function OperationsTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <KpiRow data={data} config={config} />
            <HeroAccentRow data={data} config={config} />
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function ProjectServiceTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <KpiRow data={data} config={config} />
            <div className="dash-row dash-row--2">
                <ChartBlock chartId={config.heroChart} data={data} config={config} />
                <ChartBlock chartId={config.accentChart} data={data} config={config} />
            </div>
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function SustainabilityTemplate({ data, config }: TemplateProps) {
    return (
        <>
            <KpiRow data={data} config={config} />
            <HeroAccentRow data={data} config={config} />
            <SecondaryCharts data={data} config={config} />
            <AnomaliesAndBatchesTables data={data} config={config} />
        </>
    );
}

export function renderDashboardTemplate(props: TemplateProps) {
    switch (props.config.template) {
        case "supply-chain":
            return <SupplyChainTemplate {...props} />;
        case "compliance-audit":
            return <ComplianceAuditTemplate {...props} />;
        case "finance":
            return <FinanceTemplate {...props} />;
        case "operations":
            return <OperationsTemplate {...props} />;
        case "project-service":
            return <ProjectServiceTemplate {...props} />;
        case "sustainability":
            return <SustainabilityTemplate {...props} />;
        default:
            return <ComplianceAuditTemplate {...props} />;
    }
}
