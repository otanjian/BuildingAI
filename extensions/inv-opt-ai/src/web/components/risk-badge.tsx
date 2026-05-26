export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "inv-opt-badge-high" : risk === "中" ? "inv-opt-badge-mid" : "inv-opt-badge-low";
    return <span className={`inv-opt-badge ${cls}`}>{risk}</span>;
}
