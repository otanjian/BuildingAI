export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "project-health-badge-high" : risk === "中" ? "project-health-badge-mid" : "project-health-badge-low";
    return <span className={`project-health-badge ${cls}`}>{risk}</span>;
}
