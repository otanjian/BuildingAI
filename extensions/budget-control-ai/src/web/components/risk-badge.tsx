export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "budget-control-badge-high" : risk === "中" ? "budget-control-badge-mid" : "budget-control-badge-low";
    return <span className={`budget-control-badge ${cls}`}>{risk}</span>;
}
