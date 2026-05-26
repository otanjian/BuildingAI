export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "tax-compliance-badge-high" : risk === "中" ? "tax-compliance-badge-mid" : "tax-compliance-badge-low";
    return <span className={`tax-compliance-badge ${cls}`}>{risk}</span>;
}
