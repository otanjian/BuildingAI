export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "mfg-var-badge-high" : risk === "中" ? "mfg-var-badge-mid" : "mfg-var-badge-low";
    return <span className={`mfg-var-badge ${cls}`}>{risk}</span>;
}
