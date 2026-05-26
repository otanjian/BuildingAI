export function RiskBadge({ risk }: { risk: string }) {
    const cls =
        risk === "高" ? "channel-inv-badge-high" : risk === "中" ? "channel-inv-badge-mid" : "channel-inv-badge-low";
    return <span className={`channel-inv-badge ${cls}`}>{risk}</span>;
}
