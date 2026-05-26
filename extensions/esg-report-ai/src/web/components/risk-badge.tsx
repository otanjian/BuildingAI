export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "esg-report-badge-high" : risk === "中" ? "esg-report-badge-mid" : "esg-report-badge-low";
    return <span className={`esg-report-badge ${cls}`}>{risk}</span>;
}
