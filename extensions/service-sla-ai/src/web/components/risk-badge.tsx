export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "service-sla-badge-high" : risk === "中" ? "service-sla-badge-mid" : "service-sla-badge-low";
    return <span className={`service-sla-badge ${cls}`}>{risk}</span>;
}
