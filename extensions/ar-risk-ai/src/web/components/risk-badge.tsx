export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "ar-risk-badge-high" : risk === "中" ? "ar-risk-badge-mid" : "ar-risk-badge-low";
    return <span className={`ar-risk-badge ${cls}`}>{risk}</span>;
}
