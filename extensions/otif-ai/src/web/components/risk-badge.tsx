export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "otif-badge-high" : risk === "中" ? "otif-badge-mid" : "otif-badge-low";
    return <span className={`otif-badge ${cls}`}>{risk}</span>;
}
