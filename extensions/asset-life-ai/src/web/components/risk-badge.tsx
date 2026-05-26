export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "asset-life-badge-high" : risk === "中" ? "asset-life-badge-mid" : "asset-life-badge-low";
    return <span className={`asset-life-badge ${cls}`}>{risk}</span>;
}
