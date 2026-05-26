export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "proc-audit-badge-high" : risk === "中" ? "proc-audit-badge-mid" : "proc-audit-badge-low";
    return <span className={`proc-audit-badge ${cls}`}>{risk}</span>;
}
