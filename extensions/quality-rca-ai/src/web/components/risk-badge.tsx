export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "quality-rca-badge-high" : risk === "中" ? "quality-rca-badge-mid" : "quality-rca-badge-low";
    return <span className={`quality-rca-badge ${cls}`}>{risk}</span>;
}
