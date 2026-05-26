export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "forecast-badge-high" : risk === "中" ? "forecast-badge-mid" : "forecast-badge-low";
    return <span className={`forecast-badge ${cls}`}>{risk}</span>;
}
