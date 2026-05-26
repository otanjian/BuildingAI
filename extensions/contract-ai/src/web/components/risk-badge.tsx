export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "contract-badge-high" : risk === "中" ? "contract-badge-mid" : "contract-badge-low";
    return <span className={`contract-badge ${cls}`}>{risk}</span>;
}
