export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "fx-risk-badge-high" : risk === "中" ? "fx-risk-badge-mid" : "fx-risk-badge-low";
    return <span className={`fx-risk-badge ${cls}`}>{risk}</span>;
}
