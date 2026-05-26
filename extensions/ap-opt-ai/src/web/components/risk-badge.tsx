export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "ap-opt-badge-high" : risk === "中" ? "ap-opt-badge-mid" : "ap-opt-badge-low";
    return <span className={`ap-opt-badge ${cls}`}>{risk}</span>;
}
