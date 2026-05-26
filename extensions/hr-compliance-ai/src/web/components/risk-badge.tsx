export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "hr-compliance-badge-high" : risk === "中" ? "hr-compliance-badge-mid" : "hr-compliance-badge-low";
    return <span className={`hr-compliance-badge ${cls}`}>{risk}</span>;
}
