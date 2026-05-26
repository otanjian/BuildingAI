export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "mdm-quality-badge-high" : risk === "中" ? "mdm-quality-badge-mid" : "mdm-quality-badge-low";
    return <span className={`mdm-quality-badge ${cls}`}>{risk}</span>;
}
