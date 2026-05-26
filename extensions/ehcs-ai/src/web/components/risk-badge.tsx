export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "ehcs-badge-high" : risk === "中" ? "ehcs-badge-mid" : "ehcs-badge-low";
    return <span className={`ehcs-badge ${cls}`}>{risk}</span>;
}
