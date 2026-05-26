export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "energy-carbon-badge-high" : risk === "中" ? "energy-carbon-badge-mid" : "energy-carbon-badge-low";
    return <span className={`energy-carbon-badge ${cls}`}>{risk}</span>;
}
